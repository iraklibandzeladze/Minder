<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Sent to the user when an admin approves their Pro request. */
class PlanUpgradedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Minder Pro გააქტიურდა',
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.plan-upgraded',
            with: [
                'appUrl' => rtrim((string) config('app.frontend_url', config('app.url')), '/'),
            ],
        );
    }
}
