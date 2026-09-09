# Site Images

Place optimized site images in this directory using lowercase filenames with hyphens, for example `portus-harbor.jpg`.

Because `public/` is served at the site root, reference an image in HTML with:

```html
<img src="/images/portus-harbor.jpg" alt="A misty harbor at dusk in Portus" loading="lazy">
```

Compress images before adding them. Aim for less than 300 KB when practical. For responsive images, keep the image constrained with CSS rather than a large fixed width.
