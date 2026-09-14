# SEO metadata templates

Replace bracketed values before publishing. Keep one canonical URL per public page, use an absolute URL in social tags, and add a page to the appropriate segmented sitemap.

## Writing: poem, essay, or fragment

```html
<title>[Title] - idreamofthought</title>
<meta name="description" content="[150-160 character description of the piece and its territory].">
<link rel="canonical" href="https://www.idreamofthought.org/[path]">
<meta property="og:type" content="article">
<meta property="og:title" content="[Title] - idreamofthought">
<meta property="og:description" content="[Short description]">
<meta property="og:url" content="https://www.idreamofthought.org/[path]">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"[Title]","description":"[Description]","author":{"@type":"Person","name":"Richard Jenkins"},"mainEntityOfPage":"https://www.idreamofthought.org/[path]","articleSection":"[Territory]"}
</script>
```

## Territory or collection

```html
<title>[Territory] - idreamofthought</title>
<meta name="description" content="[What this territory contains and its recurring themes].">
<link rel="canonical" href="https://www.idreamofthought.org/[path]">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"[Territory]","url":"https://www.idreamofthought.org/[path]","isPartOf":{"@type":"WebSite","name":"I Dream of Thought"}}
</script>
```

## Portus gameplay guide

```html
<title>[Guide title] - Portus</title>
<meta name="description" content="[Clear description of the Portus system or gameplay topic].">
<link rel="canonical" href="https://www.idreamofthought.org/[path]">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"[Guide title]","about":{"@type":"VideoGame","name":"Portus"},"author":{"@type":"Person","name":"Richard Jenkins"},"mainEntityOfPage":"https://www.idreamofthought.org/[path]"}
</script>
```

## Portus Codex entry or volume

```html
<title>Portus Codex [Volume or Entry] - [Subtitle]</title>
<meta name="description" content="[Concise description of the lore topic].">
<link rel="canonical" href="https://www.idreamofthought.org/[path]">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Book","name":"Portus Codex [Volume or Entry] - [Subtitle]","url":"https://www.idreamofthought.org/[path]","isPartOf":{"@type":"CreativeWorkSeries","name":"Portus Codex"}}
</script>
```