<?php

namespace App\Http\Controllers\Api;

use App\Actions\SeedScheduleTemplates;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleTemplateRequest;
use App\Http\Resources\ScheduleTemplateResource;
use App\Models\ScheduleTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ScheduleTemplateController extends Controller
{
    public function index(Request $request, SeedScheduleTemplates $seed): AnonymousResourceCollection
    {
        $user = $request->user();
        $seed->handle($user);

        return ScheduleTemplateResource::collection(
            $user->scheduleTemplates()->orderBy('position')->orderBy('id')->get()
        );
    }

    public function store(StoreScheduleTemplateRequest $request, SeedScheduleTemplates $seed): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $seed->handle($user);

        $template = $user->scheduleTemplates()->create([
            'name' => $data['name'],
            'slug' => SeedScheduleTemplates::uniqueSlug($user, $data['name']),
            'color' => strtoupper($data['color']),
            'position' => $data['position'] ?? ((int) $user->scheduleTemplates()->max('position') + 1),
        ]);

        return (new ScheduleTemplateResource($template))->response()->setStatusCode(201);
    }

    public function update(
        StoreScheduleTemplateRequest $request,
        ScheduleTemplate $scheduleTemplate,
    ): ScheduleTemplateResource {
        $this->authorize('update', $scheduleTemplate);
        $data = $request->validated();

        if (array_key_exists('name', $data)) {
            $data['slug'] = SeedScheduleTemplates::uniqueSlug(
                $request->user(),
                $data['name'],
                $scheduleTemplate->id,
            );
        }
        if (array_key_exists('color', $data)) {
            $data['color'] = strtoupper($data['color']);
        }

        $scheduleTemplate->update($data);

        return new ScheduleTemplateResource($scheduleTemplate);
    }

    public function destroy(ScheduleTemplate $scheduleTemplate): JsonResponse
    {
        $this->authorize('delete', $scheduleTemplate);

        if ($scheduleTemplate->blocks()->exists()) {
            return response()->json([
                'message' => 'შაბლონი გამოიყენება ბლოკებში — ჯერ შეცვალე ან წაშალე ის ბლოკები.',
            ], 422);
        }

        $scheduleTemplate->delete();

        return response()->json(['ok' => true]);
    }
}
