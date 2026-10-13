import { useApplyTemplate, useTemplates } from '@/hooks/useLedger'

export function TemplatesSidebar({ yearMonth }: { yearMonth: string }) {
  const templates = useTemplates()
  const apply = useApplyTemplate(yearMonth)
  const rows = (templates.data ?? []).filter((t) => t.is_active)

  return (
    <div className="templates-block">
      <h2>სწრაფი შაბლონები</h2>
      <p className="muted">ერთი კლიკი ამ თვეში</p>
      <div className="template-list">
        {rows.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-btn"
            disabled={apply.isPending}
            onClick={() => apply.mutate(template.id)}
          >
            <span>+ {template.label}</span>
            <span className="muted">
              {Number(template.amount).toFixed(0)} {template.currency}
            </span>
          </button>
        ))}
        {rows.length === 0 && !templates.isLoading && (
          <p className="muted">შაბლონები ჯერ არ არის</p>
        )}
      </div>
    </div>
  )
}
