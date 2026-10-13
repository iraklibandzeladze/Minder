<?php

namespace App\Support;

use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class PlanLimits
{
    /**
     * @return array{
     *     plan: string,
     *     label: string,
     *     max_sheets: int|null,
     *     max_notes: int|null,
     *     max_words: int|null,
     *     can_share: bool,
     *     can_password_protect: bool,
     *     sheets_used: int,
     *     notes_used: int,
     *     words_used: int,
     * }
     */
    public static function for(User $user): array
    {
        $plan = $user->isAdmin() ? 'pro' : ($user->plan ?: 'free');
        $definition = config('plans.'.$plan) ?? config('plans.free');

        return [
            'plan' => $plan,
            'label' => (string) ($definition['label'] ?? $plan),
            'max_sheets' => $definition['max_sheets'] ?? null,
            'max_notes' => $definition['max_notes'] ?? null,
            'max_words' => $definition['max_words'] ?? null,
            'can_share' => (bool) ($definition['can_share'] ?? false),
            'can_password_protect' => (bool) ($definition['can_password_protect'] ?? false),
            'sheets_used' => $user->sheets()->count(),
            'notes_used' => $user->notes()->count(),
            'words_used' => $user->words()->count(),
        ];
    }

    public static function assertCanCreateSheet(User $user): void
    {
        $limits = self::for($user);
        $max = $limits['max_sheets'];
        if ($max === null) {
            return;
        }
        if ($limits['sheets_used'] >= $max) {
            throw new HttpException(403, "ცხრილების ლიმიტი ამოწურულია ({$max}). Pro გეგმა გჭირდება.");
        }
    }

    public static function assertCanCreateNote(User $user): void
    {
        $limits = self::for($user);
        $max = $limits['max_notes'];
        if ($max === null) {
            return;
        }
        if ($limits['notes_used'] >= $max) {
            throw new HttpException(403, "ნოუთების ლიმიტი ამოწურულია ({$max}). Pro გეგმა გჭირდება.");
        }
    }

    public static function assertCanCreateWord(User $user): void
    {
        $limits = self::for($user);
        $max = $limits['max_words'];
        if ($max === null) {
            return;
        }
        if ($limits['words_used'] >= $max) {
            throw new HttpException(403, "სიტყვების ლიმიტი ამოწურულია ({$max}). Pro გეგმა გჭირდება.");
        }
    }

    public static function assertCanShare(User $user): void
    {
        if (! self::for($user)['can_share']) {
            throw new HttpException(403, 'გაზიარება ხელმისაწვდომია მხოლოდ Pro გეგმაზე.');
        }
    }

    public static function assertCanPasswordProtect(User $user): void
    {
        if (! self::for($user)['can_password_protect']) {
            throw new HttpException(403, 'პაროლით დაცვა ხელმისაწვდომია მხოლოდ Pro გეგმაზე.');
        }
    }
}
