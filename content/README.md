# Content

Eight long-form articles, written to the same research-only copy rules as the storefront,
plus a build script that packages them as a WordPress import file.

## Import them

```bash
python3 tools/build-wxr.py                      # drafts (default)
python3 tools/build-wxr.py --status publish     # publish on import
python3 tools/build-wxr.py --site https://yourdomain.com --author yourlogin
```

Then in WordPress: **Tools → Import → WordPress** (install the importer if prompted), upload
`content/import/helix-articles.wxr`, assign the posts to your user, and import.

The default is **draft** on purpose. Read each post, add your own internal links to real
product pages, then publish on the schedule below. Posts are dated a week apart ending today,
so publishing in order gives a sane archive.

Front matter carries `meta_description` and `target_query`; the importer stores both as post
meta (`_helix_meta_description`, `_helix_target_query`). If you install an SEO plugin, copy
the meta description into its field — every plugin stores it under its own key.

## The articles

| # | Article | Target query | Job |
| --- | --- | --- | --- |
| 1 | How to Read a Peptide Certificate of Analysis | how to read a peptide certificate of analysis | Pillar. Everything else links here. |
| 2 | Six Ways to Spot a Fabricated COA | fake certificate of analysis peptide | Link bait and trust. Most shareable of the set. |
| 3 | What an HPLC Purity Number Actually Tells You | hplc purity peptide meaning | Reframes the number every competitor advertises. |
| 4 | Mass Spectrometry Identity Confirmation | peptide mass spectrometry identity confirmation | Technical depth; pairs with 3. |
| 5 | Why a 5 mg Vial Does Not Contain 5 mg of Peptide | net peptide content vs gross weight | The best differentiator you have — almost nobody publishes this. |
| 6 | Storage and Stability of Lyophilized Peptides | how to store lyophilized peptides laboratory | High-volume practical query, repeat traffic. |
| 7 | Stock Solution and Dilution Arithmetic | peptide stock solution dilution calculation | Bookmark-and-return page. Highest repeat-visit potential. |
| 8 | Evaluating a Research-Materials Supplier | how to evaluate a peptide supplier | Bottom-of-funnel. Converts. |

## Writing more

Copy any file as a template. Required front matter: `title`, `slug`, `excerpt`, `category`.
Optional: `tags`, `meta_description`, `target_query`.

The markdown subset the build script understands: `##`/`###` headings, paragraphs, `-` and
`1.` lists, `|` tables, fenced code blocks, `>` blockquotes, and inline `**bold**`, `*italic*`,
`` `code` `` and `[links](url)`. Anything fancier will pass through as literal text — run the
script and check the output before importing.

Every article must pass the rules in `docs/copy-guidelines.md`. No exceptions, including in
the comments section — comments are set to closed on import for this reason.
