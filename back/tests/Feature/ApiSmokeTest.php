<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Pruebas de humo del API.
 *
 * No tocan la base de datos a proposito: corren en cualquier maquina, y en CI,
 * sin levantar MySQL ni cargar los scripts de sql/. Cubren lo que tiene que
 * seguir siendo cierto pase lo que pase:
 *
 *   - la aplicacion arranca y responde,
 *   - las rutas privadas no se abren sin token,
 *   - el login valida lo que recibe antes de consultar el directorio,
 *   - /api/* devuelve JSON y no el index.html del SPA (ver SpaController).
 */
class ApiSmokeTest extends TestCase
{
    public function test_el_healthcheck_responde(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_las_rutas_privadas_exigen_token(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->getJson('/api/tickets')->assertUnauthorized();
        $this->getJson('/api/usuarios')->assertUnauthorized();
        $this->getJson('/api/logs')->assertUnauthorized();
    }

    public function test_el_login_exige_correo_y_contrasena(): void
    {
        $this->postJson('/api/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_el_login_rechaza_un_correo_mal_formado(): void
    {
        $this->postJson('/api/login', ['email' => 'esto-no-es-un-correo', 'password' => 'loquesea'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * El fallback del SPA sirve index.html para las rutas del cliente, pero una
     * ruta de API inexistente tiene que devolver JSON: si devolviera HTML, el
     * frontend reventaria al intentar parsearlo.
     */
    public function test_una_ruta_de_api_inexistente_devuelve_json(): void
    {
        $this->getJson('/api/esta-ruta-no-existe')
            ->assertNotFound()
            ->assertJson(['status' => 'error']);
    }
}
