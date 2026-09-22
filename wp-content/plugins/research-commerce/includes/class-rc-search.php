<?php
/**
 * Catalog search.
 *
 * Listings are titled by catalog code — GLP-RT, TESA — while buyers search the
 * compound name. WordPress only searches post title, excerpt and content, so
 * "retatrutide" would find nothing. This extends the query to the analytical
 * meta, and publishes a small index the header search reads for instant
 * results.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Search.
 */
class RC_Search {

	/**
	 * Meta keys worth searching.
	 *
	 * @return string[]
	 */
	public static function fields() {
		/**
		 * Filter the meta keys included in catalog search.
		 *
		 * @param string[] $keys Meta keys.
		 */
		return apply_filters( 'rc_search_fields', array( '_rc_compound', '_sku', '_rc_cas', '_rc_lot', '_rc_formula' ) );
	}

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'pre_get_posts', array( __CLASS__, 'include_products' ) );
		add_filter( 'posts_join', array( __CLASS__, 'join_meta' ), 10, 2 );
		add_filter( 'posts_where', array( __CLASS__, 'where_meta' ), 10, 2 );
		add_filter( 'posts_distinct', array( __CLASS__, 'distinct' ), 10, 2 );

		add_action( 'init', array( __CLASS__, 'add_rewrite' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_serve_index' ) );
	}

	/**
	 * Search the catalog as well as posts and pages.
	 *
	 * @param WP_Query $query Query.
	 */
	public static function include_products( $query ) {
		if ( is_admin() || ! $query->is_main_query() || ! $query->is_search() ) {
			return;
		}

		if ( $query->get( 'post_type' ) ) {
			return; // An explicit post_type was asked for; respect it.
		}

		$query->set( 'post_type', array( 'product', 'post', 'page' ) );
	}

	/**
	 * Should this query search the analytical meta?
	 *
	 * @param WP_Query $query Query.
	 * @return bool
	 */
	protected static function applies( $query ) {
		if ( is_admin() || empty( $query->query_vars['s'] ) ) {
			return false;
		}

		$types = (array) $query->get( 'post_type' );

		return in_array( 'product', $types, true ) || in_array( 'any', $types, true ) || array() === array_filter( $types );
	}

	/**
	 * Join the meta table.
	 *
	 * @param string   $join  Join clause.
	 * @param WP_Query $query Query.
	 * @return string
	 */
	public static function join_meta( $join, $query ) {
		global $wpdb;

		if ( self::applies( $query ) && false === strpos( $join, 'rc_search_meta' ) ) {
			$join .= " LEFT JOIN {$wpdb->postmeta} AS rc_search_meta ON {$wpdb->posts}.ID = rc_search_meta.post_id ";
		}

		return $join;
	}

	/**
	 * Widen the WHERE clause to the meta values.
	 *
	 * WordPress builds one bracketed group per search word. Each group is
	 * extended in place with the same word matched against the analytical
	 * meta, so a two-word query still narrows rather than widens.
	 *
	 * @param string   $where Where clause.
	 * @param WP_Query $query Query.
	 * @return string
	 */
	public static function where_meta( $where, $query ) {
		global $wpdb;

		if ( ! self::applies( $query ) ) {
			return $where;
		}

		$keys         = self::fields();
		$placeholders = implode( ',', array_fill( 0, count( $keys ), '%s' ) );

		return (string) preg_replace_callback(
			"/\(\s*{$wpdb->posts}\.post_title\s+LIKE\s*('[^']+')\s*\)/",
			function ( $matches ) use ( $wpdb, $keys, $placeholders ) {
				// $matches[1] is already a quoted, escaped LIKE value.
				$clause = $wpdb->prepare(
					"rc_search_meta.meta_key IN ($placeholders)", // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
					$keys
				);

				return '( ' . $matches[0] . ' OR ( ' . $clause . ' AND rc_search_meta.meta_value LIKE ' . $matches[1] . ' ) )';
			},
			$where
		);
	}

	/**
	 * One row per post despite the join.
	 *
	 * @param string   $distinct Distinct clause.
	 * @param WP_Query $query    Query.
	 * @return string
	 */
	public static function distinct( $distinct, $query ) {
		return self::applies( $query ) ? 'DISTINCT' : $distinct;
	}

	/**
	 * Pretty URL for the index.
	 */
	public static function add_rewrite() {
		add_rewrite_rule( '^catalog-index\.json$', 'index.php?rc_index=products', 'top' );
	}

	/**
	 * Register the query var.
	 *
	 * @param array $vars Query vars.
	 * @return array
	 */
	public static function query_vars( $vars ) {
		$vars[] = 'rc_index';
		return $vars;
	}

	/**
	 * The catalog as JSON, for instant search in the header.
	 */
	public static function maybe_serve_index() {
		$asked = get_query_var( 'rc_index' );

		if ( ! $asked && isset( $_GET['rc_index'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$asked = sanitize_key( wp_unslash( $_GET['rc_index'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}

		if ( 'products' !== $asked ) {
			return;
		}

		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		echo wp_json_encode( self::index() );
		exit;
	}

	/**
	 * Build the index.
	 *
	 * @return array
	 */
	public static function index() {
		$items = array();

		foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'posts_per_page' => 500, 'fields' => 'ids' ) ) as $id ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( $id ) : null;

			$thumb = '';
			if ( has_post_thumbnail( $id ) ) {
				$src = wp_get_attachment_image_src( get_post_thumbnail_id( $id ), 'thumbnail' );
				$thumb = $src ? $src[0] : '';
			}

			$compound = (string) get_post_meta( $id, '_rc_compound', true );

			// A panel has no compound of its own; list what is in the box so
			// searching a component name still surfaces the set.
			if ( ! $compound && class_exists( 'RC_Panels' ) && RC_Panels::is_panel( $id ) ) {
				$parts = array();
				foreach ( RC_Panels::components( $id ) as $component ) {
					$name = get_post_meta( $component, '_rc_compound', true );
					if ( $name ) {
						$parts[] = $name;
					}
				}
				$compound = implode( ' + ', $parts );
			}

			$items[] = array(
				'name'     => get_the_title( $id ),
				'compound' => $compound,
				'sku'      => (string) get_post_meta( $id, '_sku', true ),
				'cas'      => (string) get_post_meta( $id, '_rc_cas', true ),
				'size'     => (string) get_post_meta( $id, '_rc_quantity', true ),
				'url'      => get_permalink( $id ),
				'thumb'    => $thumb,
				'price'    => $product ? html_entity_decode( wp_strip_all_tags( wc_price( $product->get_price() ) ), ENT_QUOTES, 'UTF-8' ) : '',
				'stock'    => $product ? (bool) $product->is_in_stock() : true,
			);
		}

		/**
		 * Filter the search index.
		 *
		 * @param array $items Index rows.
		 */
		return apply_filters( 'rc_search_index', $items );
	}
}
