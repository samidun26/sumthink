# Development documentation

This documentation is part of development, not a separate task at the end. Update the relevant documents in the same change as the behavior they describe. Record outcomes and evidence, not only intentions.

Current product: the standalone Apple silicon macOS app. Start with the [illustrated how-to guide](user-guide.md), [preview gallery](preview.md), or [macOS installation guide](macos-app.md). The earlier browser prototype is documented as history.

| Document | Purpose | Update trigger |
| --- | --- | --- |
| [Product brief](product-brief.md) | Owner context, problem, scope, and success criteria | Discovery answer or scope change |
| [Experience design](experience-design.md) | Journeys, interactions, visual and accessibility rules | New flow or design decision |
| [Architecture](architecture.md) | Platform, data boundaries, integrations, and technical constraints | Technical decision or implementation change |
| [Roadmap](roadmap.md) | Milestones, dependencies, and completion evidence | Work starts, finishes, or changes scope |
| [Validation](validation.md) | Acceptance scenarios and actual verification results | Behavior changes or a check runs |
| [Development log](development-log.md) | Dated progress, findings, and next steps | Meaningful development session |
| [Decision records](decisions/README.md) | Decisions and reasons | A consequential tradeoff is resolved |
| [User guide](user-guide.md) | Illustrated daily workflow, shortcuts, and backups | User-visible behavior changes |
| [Preview gallery](preview.md) | Logo, screenshots, and reproducible capture instructions | Visual or workflow changes |
| [Deployment](deployment.md) | Source and desktop packaging procedure | Hosting or release workflow changes |
| [macOS app](macos-app.md) | Installation, native controls, task workflow, backup, and platform limits | Desktop behavior or release changes |

## Documentation rules

1. Separate confirmed facts, proposed ideas, and unresolved questions.
2. Tie each feature to a concrete user need and an observable acceptance scenario.
3. Before implementation, document the flow and any data or permission requirements.
4. When implementation changes, update architecture and usage instructions as necessary.
5. After verification, record what ran, its result, and platform limitations.
6. At milestone completion, record delivered behavior, remaining work, and known issues.
7. Add a setup and user guide once actual runnable software exists; document commands that have been checked.

Use Asia/Jakarta for dated progress notes. Do not store credentials in these documents.
