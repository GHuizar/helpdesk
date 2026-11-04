<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Correo de notificacion de ticket (mismo contenido que la notificacion in-app).
 */
class TicketNotificacionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $titulo,
        public ?string $cuerpo,
        public ?string $folio,
        public string $url,
        public ?string $responsable = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->titulo);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.notificacion');
    }
}
