<?php

namespace App\Exceptions;

use RuntimeException;

class SocialAuthException extends RuntimeException
{
    /**
     * @param  string  $reason  Short machine-readable reason forwarded to the SPA as `?auth_error=`.
     */
    public function __construct(public readonly string $reason)
    {
        parent::__construct("Social auth failed: {$reason}");
    }
}
