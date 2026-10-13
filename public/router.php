<?php

/**
 * Router for PHP built-in development server.
 * Serves static files directly and delegates everything else to index.php.
 *
 * The desktop app ships without the public/lang and public/storage symlinks
 * (the install directory is read-only), so these virtual directories are
 * resolved at runtime:
 *   - /lang/*.json        -> the app's lang/ directory
 *   - /storage/*          -> the user-writable storage area (APP_STORAGE_PATH)
 */
$uri = urldecode( parse_url( $_SERVER[ 'REQUEST_URI' ], PHP_URL_PATH ) );

if ( $uri !== '/' && file_exists( __DIR__ . $uri ) ) {
    return false;
}

/**
 * Serve language files from the repo /lang directory.
 * Prevent path traversal by only allowing a flat *.json lookup.
 */
if ( preg_match( '#^/lang/([a-zA-Z0-9_-]+\.json)$#', $uri, $matches ) ) {
    $file = __DIR__ . '/../lang/' . $matches[ 1 ];

    if ( is_file( $file ) ) {
        header( 'Content-Type: application/json; charset=utf-8' );
        readfile( $file );

        exit;
    }
}

/**
 * Serve uploaded media from the user-writable storage/app/public.
 */
if ( preg_match( '#^/storage/(.+)$#', $uri, $matches ) ) {
    $storagePath = getenv( 'APP_STORAGE_PATH' ) ?: ( __DIR__ . '/../storage' );
    $publicPath = rtrim( $storagePath, '/' ) . '/app/public';
    $file = realpath( $publicPath . '/' . $matches[ 1 ] );

    if ( $file !== false && str_starts_with( $file, realpath( $publicPath ) ) ) {
        $mimes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'bmp' => 'image/bmp',
            'ico' => 'image/x-icon',
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv' => 'text/csv',
            'txt' => 'text/plain',
            'zip' => 'application/zip',
            'json' => 'application/json',
        ];

        $extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
        header( 'Content-Type: ' . ( $mimes[ $extension ] ?? 'application/octet-stream' ) );

        readfile( $file );

        exit;
    }
}

require __DIR__ . '/index.php';
