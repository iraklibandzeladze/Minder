<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Sent to platform admins when a user asks for the Pro plan. */
class ProRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $requester) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Pro მოთხოვნა: {$this->requester->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.pro-request',
            with: [
                'adminUrl' => rtrim((string) config('app.frontend_url', config('app.url')), '/').'/?view=admin',
            ],
        );
    }
}
