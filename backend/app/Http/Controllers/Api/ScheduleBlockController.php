<?php

namespace App\Http\Controllers\Api;

use App\Actions\SeedScheduleDefaults;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleBlockRequest;
use App\Http\Resources\ScheduleBlockResource;
use App\Models\ScheduleBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ScheduleBlockController extends Controller
{
    public function index(Request $request, SeedScheduleDefaults $seed): AnonymousResourceCollection
    {
        $user = $request->user();
        $seed->handle($user);

        $blocks = $user->scheduleBlocks()
            ->with('template')
            ->orderBy('weekday')
            ->orderBy('position')
            ->orderBy('start_time')
            ->orderBy('id')
            ->get();

        return ScheduleBlockResource::collection($blocks);
    }

    public function store(StoreScheduleBlockRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $block = $user->scheduleBlocks()->create([
            'weekday' => $data['weekday'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'title' => $data['title'],
            'schedule_template_id' => $data['schedule_template_id'],
            'notes' => $data['notes'] ?? null,
            'position' => $data['position'] ?? ((int) $user->scheduleBlocks()
                ->where('weekday', $data['weekday'])
                ->max('position') + 1),
        ]);

        $block->load('template');

        return (new ScheduleBlockResource($block))->response()->setStatusCode(201);
    }

    public function update(StoreScheduleBlockRequest $request, ScheduleBlock $scheduleBlock): ScheduleBlockResource
    {
        $this->authorize('update', $scheduleBlock);
        $scheduleBlock->update($request->validated());
        $scheduleBlock->load('template');

        return new ScheduleBlockResource($scheduleBlock);
    }

    public function destroy(ScheduleBlock $scheduleBlock): JsonResponse
    {
        $this->authorize('delete', $scheduleBlock);
        $scheduleBlock->delete();

        return response()->json(['ok' => true]);
    }
}
