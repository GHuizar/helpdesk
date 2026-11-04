<?php

/*
|--------------------------------------------------------------------------
| CORS para el SPA (React/Vite)
|--------------------------------------------------------------------------
| Usamos tokens Bearer (Sanctum), NO cookies, por lo que supports_credentials
| puede ser false y allowed_origins '*' es seguro en desarrollo.
| En produccion conviene restringir allowed_origins al dominio del frontend.
*/

return [
    'paths' => ['api/*', 'login', 'logout', 'me', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
