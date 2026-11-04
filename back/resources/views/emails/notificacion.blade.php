<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $titulo }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#2f4654;border-radius:12px 12px 0 0;padding:18px 24px;">
      <span style="color:#ffffff;font-size:16px;font-weight:bold;">HelpDesk</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px;color:#111827;">{{ $titulo }}</h1>
      @if($cuerpo)
        <p style="font-size:14px;line-height:1.5;color:#4b5563;margin:0 0 20px;">{{ $cuerpo }}</p>
      @endif
      @if($folio || $responsable)
        <div style="font-size:13px;color:#6b7280;margin:0 0 20px;">
          @if($folio)<p style="margin:0 0 4px;">Folio: <strong style="color:#111827;">{{ $folio }}</strong></p>@endif
          @if($responsable)<p style="margin:0;">Responsable: <strong style="color:#111827;">{{ $responsable }}</strong></p>@endif
        </div>
      @endif
      <a href="{{ $url }}" style="display:inline-block;background:#3a5667;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 22px;border-radius:8px;">Ver ticket</a>
      <p style="font-size:11px;color:#9ca3af;margin:24px 0 0;">Mensaje automatico del sistema de tickets. No respondas a este correo.</p>
    </div>
  </div>
</body>
</html>
