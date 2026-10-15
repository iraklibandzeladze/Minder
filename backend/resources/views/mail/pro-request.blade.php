Pro გეგმის მოთხოვნა — Minder

მომხმარებელი: {{ $requester->name }} ({{ $requester->email }})
რეგისტრაცია: {{ optional($requester->created_at)->timezone(config('app.timezone'))->format('Y-m-d') }}
ცხრილები: {{ $requester->sheets()->count() }} · ნოუთები: {{ $requester->notes()->count() }}
@if($requester->pro_request_note)

შეტყობინება:
{{ $requester->pro_request_note }}
@endif

დადასტურება ან უარყოფა ადმინ პანელში:
{{ $adminUrl }}
