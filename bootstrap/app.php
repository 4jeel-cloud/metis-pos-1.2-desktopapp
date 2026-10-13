<?php

use App\Classes\ModuleRouting;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

$app = Application::configure( basePath: dirname( __DIR__ ) )
    ->withRouting(
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        using: function () {
            Route::middleware( 'api' )
                ->prefix( 'api' )
                ->group( base_path( 'routes/api.php' ) );

            Route::middleware( 'web' )
                ->group( base_path( 'routes/web.php' ) );

            ModuleRouting::register();
        },
    )
    ->withSchedule( function ( Schedule $schedule ) {
        include_once __DIR__ . '/modules-schedule.php';
    } )
    ->withMiddleware( function ( Middleware $middleware ) {
        include_once __DIR__ . '/middleware.php';
    } )
    ->withExceptions( function ( Exceptions $exceptions ) {
        include_once __DIR__ . '/exceptions.php';
    } )->create();

/**
 * Allow override of the storage path via APP_STORAGE_PATH
 * environment variable — used by the Electron desktop app
 * so that logs, cache, sessions, and views go to a writable
 * user data directory outside the read-only app bundle.
 */
if ( $storagePath = ( $_ENV[ 'APP_STORAGE_PATH' ] ?? $_SERVER[ 'APP_STORAGE_PATH' ] ?? null ) ) {
    $app->useStoragePath( $storagePath );
}

/**
 * Allow override of the .env file path via APP_ENV_PATH
 * environment variable — used by the Electron desktop app
 * so that .env lives in a persistent user data directory.
 */
$envPath = $_ENV[ 'APP_ENV_PATH' ] ?? $_SERVER[ 'APP_ENV_PATH' ] ?? null;
if ( $envPath && file_exists( $envPath ) ) {
    $app->loadEnvironmentFrom( basename( $envPath ) );
    $app->useEnvironmentPath( dirname( $envPath ) );
}

return $app;
