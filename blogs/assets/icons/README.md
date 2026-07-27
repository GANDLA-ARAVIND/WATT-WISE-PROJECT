# Icons

Icon assets for the documentation and any portfolio rendering of it.

## Source of truth

The application itself uses **[lucide-react](https://lucide.dev) 0.468.0** exclusively — there are no custom icon files in the codebase. Icons referenced across the UI:

| Icon | Where |
|---|---|
| `Home`, `FileText`, `LineChart`, `Lightbulb`, `Bot`, `Settings` | Primary navigation (`lib/navigation.ts`) |
| `UploadCloud` | Upload card |
| `ScanSearch`, `Pencil`, `Trash2`, `RotateCcw`, `Download`, `X` | Bill workspace actions |
| `AlertTriangle`, `ShieldCheck`, `ShieldAlert` | Validation and risk states |
| `Sparkles`, `Radar`, `TrendingUp`, `Activity`, `Zap`, `Leaf`, `Target`, `Cloud` | Dashboard and analytics sections |
| `CheckCircle2`, `CircleDashed`, `ChevronRight`, `ChevronDown`, `Check` | Setup status and onboarding |
| `Loader2` | Every loading state |
| `Users`, `Building2`, `MapPin` | Household profile |
| `SendHorizonal` | Assistant input |

## Palette

Matching `tailwind.config.ts`, so exported assets sit correctly on the app's surfaces:

| Token | Hex | Use |
|---|---|---|
| background | `#0B0F19` | Page background |
| card | `#111827` | Surfaces |
| primary | `#10B981` | Accent, also the `Cooling` category color |
| secondary | `#3B82F6` | Also the `Always Active` category color |
| foreground | `#F9FAFB` | Text |
| muted | `#9CA3AF` | Secondary text |
| border | `#1F2937` | Dividers |

Backend-defined category colors (returned in every contribution payload):

| Category | Hex |
|---|---|
| Cooling | `#10B981` |
| Lighting | `#F59E0B` |
| Always Active | `#3B82F6` |
| Entertainment | `#8B5CF6` |
| Utility | `#F97316` |
| Fallback | `#94A3B8` |

## Adding assets

Prefer SVG. Keep filenames kebab-case and descriptive (`bill-upload.svg`, not `icon1.svg`). If an icon represents a contribution category, use the hex above so documentation matches the running application.
