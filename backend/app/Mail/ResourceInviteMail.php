<?php

namespace App\Mail;

use App\Models\ResourceShare;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResourceInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ResourceShare $share,
        public string $resourceTitle,
        public string $inviterName,
    ) {}

    public function envelope(): Envelope
    {
        $kind = $this->share->shareable_type === 'note' ? 'ნოუთი' : 'ცხრილი';

        return new Envelope(
            subject: "მოწვევა: {$kind} „{$this->resourceTitle}“",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.resource-invite-text',
            with: [
                'inviteUrl' => $this->share->inviteUrl(),
                'resourceTitle' => $this->resourceTitle,
                'inviterName' => $this->inviterName,
                'roleLabel' => $this->share->role === 'moderator' ? 'მოდერატორი' : 'მხოლოდ ნახვა',
                'kindLabel' => $this->share->shareable_type === 'note' ? 'ნოუთი' : 'ცხრილი',
            ],
        );
    }
}
