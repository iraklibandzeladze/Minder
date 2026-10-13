<?php

namespace App\Mail;

use App\Models\SheetRow;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RowReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public SheetRow $row) {}

    public function envelope(): Envelope
    {
        $title = $this->row->title ?: 'რიგი';

        return new Envelope(
            subject: "შეხსენება: {$title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.row-reminder',
        );
    }
}
