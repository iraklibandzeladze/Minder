<?php

namespace App\Http\Controllers\Api;

use App\Actions\RolloverSheetRows;
use App\Actions\SeedSheetDefaults;
use App\Http\Controllers\Controller;
use App\Http\Resources\SheetResource;
use App\Http\Resources\SheetRowResource;
use App\Models\Sheet;
use App\Support\PlanLimits;
use App\Support\ResourceUnlock;
use App\Support\ShareAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SheetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return SheetResource::collection(
            ShareAccess::sheetQueryFor($request->user())->orderBy('position')->orderBy('id')->get()
        );
    }

    public function store(Request $request, SeedSheetDefaults $seed): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'kind' => ['required', Rule::in(['table', 'monthly_expenses', 'calculator'])],
            'reminders_enabled' => ['sometimes', 'boolean'],
            'password_protected' => ['sometimes', 'boolean'],
            'password' => [
                'nullable',
                'required_if:password_protected,true',
                'string',
                'min:4',
                'max:72',
                'confirmed',
            ],
        ]);

        $user = $request->user();
        PlanLimits::assertCanCreateSheet($user);

        $kind = $data['kind'];
        $baseSlug = Str::slug($data['name']);
        if ($baseSlug === '') {
            $baseSlug = 'sheet_'.Str::lower(Str::random(6));
        }
        $slug = $baseSlug;
        $i = 1;
        while ($user->sheets()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$i++;
        }

        $protected = (bool) ($data['password_protected'] ?? false);
        $password = $data['password'] ?? null;
        if ($protected) {
            PlanLimits::assertCanPasswordProtect($user);
        }

        $sheet = DB::transaction(function () use ($user, $data, $slug, $kind, $seed, $protected, $password) {
            $sheet = $user->sheets()->create([
                'name' => $data['name'],
                'slug' => $slug,
                'kind' => $kind,
                'position' => (int) $user->sheets()->max('position') + 1,
                'is_default' => false,
                'reminders_enabled' => (bool) ($data['reminders_enabled'] ?? false),
                'password_hash' => $protected && filled($password) ? Hash::make($password) : null,
            ]);

            $seed->handle($sheet);

            return $sheet;
        });

        return (new SheetResource($sheet))->response()->setStatusCode(201);
    }

    public function update(Request $request, Sheet $sheet): SheetResource
    {
        $this->authorize('update', $sheet);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'budget' => ['sometimes', 'nullable', 'numeric'],
            'reminders_enabled' => ['sometimes', 'boolean'],
        ]);
        $sheet->update($data);

        return new SheetResource($sheet);
    }

    public function unlock(Request $request, Sheet $sheet): SheetResource|JsonResponse
    {
        $this->authorize('update', $sheet);

        $data = $request->validate([
            'password' => ['required', 'string', 'max:72'],
        ]);

        if (! ResourceUnlock::attemptSheet($sheet, $data['password'])) {
            return response()->json([
                'message' => 'პაროლი არასწორია.',
                'errors' => ['password' => ['პაროლი არასწორია.']],
            ], 422);
        }

        return new SheetResource($sheet);
    }

    public function lock(Sheet $sheet): SheetResource
    {
        $this->authorize('update', $sheet);
        ResourceUnlock::lockSheet($sheet);

        return new SheetResource($sheet);
    }

    public function destroy(Request $request, Sheet $sheet): JsonResponse
    {
        $this->authorize('delete', $sheet);

        if (ResourceUnlock::sheetHasPassword($sheet)) {
            $data = $request->validate([
                'password' => ['required', 'string', 'max:72'],
            ]);

            if (! Hash::check($data['password'], (string) $sheet->password_hash)) {
                return response()->json([
                    'message' => 'პაროლი არასწორია.',
                    'errors' => ['password' => ['პაროლი არასწორია.']],
                ], 422);
            }
        }

        $sheet->delete();

        return response()->json(['ok' => true]);
    }

    public function rollover(Request $request, Sheet $sheet, RolloverSheetRows $rollover): JsonResponse
    {
        $this->authorize('update', $sheet);
        ResourceUnlock::abortUnlessSheetUnlocked($sheet);

        $data = $request->validate([
            'year_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $created = $rollover->handle($request->user(), $sheet, $data['year_month']);

        $rows = $sheet->rows()
            ->where('user_id', $request->user()->id)
            ->where('year_month', $data['year_month'])
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return response()->json([
            'created' => $created,
            'data' => SheetRowResource::collection($rows)->resolve(),
        ]);
    }
}
