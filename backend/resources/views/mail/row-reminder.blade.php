შეხსენება — Minder

ცხრილი: {{ $row->sheet?->name ?? '—' }}
რიგი: {{ $row->title ?: 'უსახელო' }}
@if($row->notes)
შენიშვნა: {{ $row->notes }}
@endif
დრო: {{ optional($row->reminder_at)->timezone(config('app.timezone'))->format('Y-m-d H:i') }}
