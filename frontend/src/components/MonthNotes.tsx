import { useEffect, useState } from 'react'
import { useMonth, useUpdateMonthNote } from '@/hooks/useLedger'

export function MonthNotes({ yearMonth }: { yearMonth: string }) {
  const month = useMonth(yearMonth)
  const update = useUpdateMonthNote(yearMonth)
  const [body, setBody] = useState('')

  useEffect(() => {
    setBody(month.data?.note.body ?? '')
  }, [month.data?.note.body, yearMonth])

  return (
    <section className="month-notes">
      <div className="month-notes-head">
        <h2>თვის შენიშვნები</h2>
        <button
          type="button"
          className="btn-ghost"
          disabled={update.isPending}
          onClick={() => update.mutate(body)}
        >
          შენახვა
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="მაგ: ამ თვეში სესხი დაიფარა ნაწილობრივ"
        rows={4}
      />
    </section>
  )
}
