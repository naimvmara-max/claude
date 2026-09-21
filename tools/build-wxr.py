#!/usr/bin/env python3
"""Turn content/articles/*.md into a WordPress WXR import file.

Usage:
    python3 tools/build-wxr.py [--status publish] [--site https://example.com]

The markdown subset supported here is the one the articles actually use:
headings, paragraphs, bullet and numbered lists, tables, fenced code blocks,
blockquotes, and inline bold / italic / code / links.
"""

import argparse
import html
import pathlib
import re
import sys
from datetime import datetime, timedelta, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARTICLES = ROOT / "content" / "articles"
OUT = ROOT / "content" / "import" / "helix-articles.wxr"

INLINE = [
    (re.compile(r"`([^`]+)`"), r"<code>\1</code>"),
    (re.compile(r"\*\*([^*]+)\*\*"), r"<strong>\1</strong>"),
    (re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)"), r"<em>\1</em>"),
    (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<a href="\2">\1</a>'),
]


def parse_front_matter(text):
    if not text.startswith("---"):
        raise ValueError("missing front matter")
    _, raw, body = text.split("---", 2)
    meta = {}
    for line in raw.strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            value = [v.strip() for v in value[1:-1].split(",") if v.strip()]
        else:
            value = value.strip('"')
        meta[key.strip()] = value
    return meta, body.strip()


def inline(text):
    out = html.escape(text, quote=False)
    for pattern, repl in INLINE:
        out = pattern.sub(repl, out)
    return out


def render(body):
    """Markdown subset -> HTML blocks."""
    lines = body.split("\n")
    out = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Fenced code.
        if stripped.startswith("```"):
            i += 1
            block = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1
            out.append("<pre><code>" + html.escape("\n".join(block)) + "</code></pre>")
            continue

        # Headings.
        heading = re.match(r"^(#{2,4})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            out.append(f"<h{level}>{inline(heading.group(2))}</h{level}>")
            i += 1
            continue

        # Tables: a header row, a separator row, then body rows.
        if stripped.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].strip()) <= set("|-: "):
            header = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            thead = "".join(f"<th>{inline(c)}</th>" for c in header)
            tbody = "".join(
                "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>" for row in rows
            )
            out.append(f"<table><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table>")
            continue

        # Lists.
        bullet = re.match(r"^[-*]\s+(.*)$", stripped)
        number = re.match(r"^\d+\.\s+(.*)$", stripped)
        if bullet or number:
            tag = "ul" if bullet else "ol"
            pattern = re.compile(r"^[-*]\s+(.*)$" if bullet else r"^\d+\.\s+(.*)$")
            items = []
            while i < len(lines):
                match = pattern.match(lines[i].strip())
                if not match:
                    if lines[i].strip():
                        break
                    # A blank line ends the list unless the next line continues it.
                    if i + 1 < len(lines) and pattern.match(lines[i + 1].strip()):
                        i += 1
                        continue
                    break
                items.append(f"<li>{inline(match.group(1))}</li>")
                i += 1
            out.append(f"<{tag}>" + "".join(items) + f"</{tag}>")
            continue

        # Blockquote.
        if stripped.startswith(">"):
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append("<blockquote><p>" + inline(" ".join(quote)) + "</p></blockquote>")
            continue

        # Paragraph: consume until a blank line.
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{2,4}\s|[-*]\s|\d+\.\s|>|\||```)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")

    return "\n\n".join(out)


def cdata(text):
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", default="draft", choices=["draft", "publish", "pending"])
    parser.add_argument("--site", default="https://example.com")
    parser.add_argument("--author", default="admin")
    args = parser.parse_args()

    files = sorted(ARTICLES.glob("*.md"))
    if not files:
        sys.exit("no articles found in content/articles/")

    items = []
    categories = {}
    tags = {}
    # Space posts a week apart, oldest first, ending today.
    base = datetime.now(timezone.utc) - timedelta(days=7 * (len(files) - 1))

    for index, path in enumerate(files):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        for field in ("title", "slug", "excerpt", "category"):
            if field not in meta:
                sys.exit(f"{path.name}: missing '{field}' in front matter")

        published = base + timedelta(days=7 * index)
        content = render(body)

        categories[meta["category"]] = re.sub(r"[^a-z0-9]+", "-", meta["category"].lower()).strip("-")
        terms = [f'<category domain="category" nicename="{categories[meta["category"]]}">{cdata(meta["category"])}</category>']
        for tag in meta.get("tags", []):
            slug = re.sub(r"[^a-z0-9]+", "-", tag.lower()).strip("-")
            tags[tag] = slug
            terms.append(f'<category domain="post_tag" nicename="{slug}">{cdata(tag)}</category>')

        items.append(f"""	<item>
		<title>{cdata(meta["title"])}</title>
		<link>{args.site}/{meta["slug"]}/</link>
		<pubDate>{published.strftime("%a, %d %b %Y %H:%M:%S +0000")}</pubDate>
		<dc:creator>{cdata(args.author)}</dc:creator>
		<guid isPermaLink="false">{args.site}/?p={1000 + index}</guid>
		<description></description>
		<content:encoded>{cdata(content)}</content:encoded>
		<excerpt:encoded>{cdata(meta["excerpt"])}</excerpt:encoded>
		<wp:post_id>{1000 + index}</wp:post_id>
		<wp:post_date>{cdata(published.strftime("%Y-%m-%d %H:%M:%S"))}</wp:post_date>
		<wp:post_date_gmt>{cdata(published.strftime("%Y-%m-%d %H:%M:%S"))}</wp:post_date_gmt>
		<wp:comment_status>{cdata("closed")}</wp:comment_status>
		<wp:ping_status>{cdata("closed")}</wp:ping_status>
		<wp:post_name>{cdata(meta["slug"])}</wp:post_name>
		<wp:status>{cdata(args.status)}</wp:status>
		<wp:post_parent>0</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type>{cdata("post")}</wp:post_type>
		<wp:post_password></wp:post_password>
		<wp:is_sticky>0</wp:is_sticky>
{chr(10).join("		" + term for term in terms)}
		<wp:postmeta>
			<wp:meta_key>{cdata("_helix_meta_description")}</wp:meta_key>
			<wp:meta_value>{cdata(meta.get("meta_description", ""))}</wp:meta_value>
		</wp:postmeta>
		<wp:postmeta>
			<wp:meta_key>{cdata("_helix_target_query")}</wp:meta_key>
			<wp:meta_value>{cdata(meta.get("target_query", ""))}</wp:meta_value>
		</wp:postmeta>
	</item>""")

    term_xml = []
    for name, slug in categories.items():
        term_xml.append(f"""	<wp:category>
		<wp:category_nicename>{cdata(slug)}</wp:category_nicename>
		<wp:category_parent></wp:category_parent>
		<wp:cat_name>{cdata(name)}</wp:cat_name>
	</wp:category>""")
    for name, slug in tags.items():
        term_xml.append(f"""	<wp:tag>
		<wp:tag_slug>{cdata(slug)}</wp:tag_slug>
		<wp:tag_name>{cdata(name)}</wp:tag_name>
	</wp:tag>""")

    xml = f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
	<title>Helix Research — analytical articles</title>
	<link>{args.site}</link>
	<description>Documentation and analytical-method articles for a research-materials catalog.</description>
	<pubDate>{datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")}</pubDate>
	<language>en-US</language>
	<wp:wxr_version>1.2</wp:wxr_version>
	<wp:base_site_url>{args.site}</wp:base_site_url>
	<wp:base_blog_url>{args.site}</wp:base_blog_url>
	<wp:author>
		<wp:author_id>1</wp:author_id>
		<wp:author_login>{cdata(args.author)}</wp:author_login>
		<wp:author_email></wp:author_email>
		<wp:author_display_name>{cdata(args.author)}</wp:author_display_name>
		<wp:author_first_name></wp:author_first_name>
		<wp:author_last_name></wp:author_last_name>
	</wp:author>
{chr(10).join(term_xml)}
{chr(10).join(items)}
</channel>
</rss>
"""

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(xml, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(files)} posts, status '{args.status}'")


if __name__ == "__main__":
    main()
