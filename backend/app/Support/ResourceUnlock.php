<?php

namespace App\Support;

use App\Models\Note;
use App\Models\Sheet;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResourceUnlock
{
    public static function noteHasPassword(Note $note): bool
    {
        return filled($note->password_hash);
    }

    public static function sheetHasPassword(Sheet $sheet): bool
    {
        return filled($sheet->password_hash);
    }

    public static function isNoteUnlocked(Note $note, ?User $user = null): bool
    {
        if (! self::noteHasPassword($note)) {
            return true;
        }

        if ($user !== null
            && ! ShareAccess::isOwner($user, $note)
            && ShareAccess::canView($user, $note)) {
            return true;
        }

        return (bool) (session('unlocked_notes', [])[$note->id] ?? false);
    }

    public static function isSheetUnlocked(Sheet $sheet, ?User $user = null): bool
    {
        if (! self::sheetHasPassword($sheet)) {
            return true;
        }

        if ($user !== null
            && ! ShareAccess::isOwner($user, $sheet)
            && ShareAccess::canView($user, $sheet)) {
            return true;
        }

        return (bool) (session('unlocked_sheets', [])[$sheet->id] ?? false);
    }

    public static function unlockNote(Note $note): void
    {
        $ids = session('unlocked_notes', []);
        $ids[$note->id] = true;
        session(['unlocked_notes' => $ids]);
    }

    public static function lockNote(Note $note): void
    {
        $ids = session('unlocked_notes', []);
        unset($ids[$note->id]);
        session(['unlocked_notes' => $ids]);
    }

    public static function unlockSheet(Sheet $sheet): void
    {
        $ids = session('unlocked_sheets', []);
        $ids[$sheet->id] = true;
        session(['unlocked_sheets' => $ids]);
    }

    public static function lockSheet(Sheet $sheet): void
    {
        $ids = session('unlocked_sheets', []);
        unset($ids[$sheet->id]);
        session(['unlocked_sheets' => $ids]);
    }

    public static function attemptNote(Note $note, string $password): bool
    {
        if (! self::noteHasPassword($note)) {
            self::unlockNote($note);

            return true;
        }

        if (! Hash::check($password, (string) $note->password_hash)) {
            return false;
        }

        self::unlockNote($note);

        return true;
    }

    public static function attemptSheet(Sheet $sheet, string $password): bool
    {
        if (! self::sheetHasPassword($sheet)) {
            self::unlockSheet($sheet);

            return true;
        }

        if (! Hash::check($password, (string) $sheet->password_hash)) {
            return false;
        }

        self::unlockSheet($sheet);

        return true;
    }

    public static function abortUnlessNoteUnlocked(Note $note, ?User $user = null): void
    {
        if (! self::isNoteUnlocked($note, $user)) {
            abort(response()->json([
                'message' => 'ნოუთი დაცულია პაროლით.',
                'locked' => true,
            ], 423));
        }
    }

    public static function abortUnlessSheetUnlocked(Sheet $sheet, ?User $user = null): void
    {
        if (! self::isSheetUnlocked($sheet, $user)) {
            abort(response()->json([
                'message' => 'ცხრილი დაცულია პაროლით.',
                'locked' => true,
            ], 423));
        }
    }
}
