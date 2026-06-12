# AR filter assets

All lenses are defined in `src/features/ar-filters/filter-manifest.ts`.

## Add a new filter

1. Drop a transparent PNG in `public/ar-filters/images/your-filter.png`
2. Register an entry in `filter-manifest.ts` (anchor, scale, offsets)
3. The catalog and lens rail update automatically

## Anchors

| Anchor | Use for |
|--------|---------|
| `eyes` | Glasses, goggles |
| `forehead` | Hats, wizard caps |
| `face-center` | Full-face masks, memes |
| `mouth` | Mustaches, lips |

Set `chromaKey: true` if the PNG has a solid black background.
