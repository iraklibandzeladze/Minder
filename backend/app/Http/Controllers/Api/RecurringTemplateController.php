<?php

namespace App\Http\Controllers\Api;

use App\Actions\ApplyRecurringTemplate;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRecurringTemplateRequest;
use App\Http\Resources\RecurringTemplateResource;
use App\Http\Resources\TransactionResource;
use App\Models\RecurringTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecurringTemplateController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return RecurringTemplateResource::collection(
            $request->user()->recurringTemplates()->with(['account', 'category'])->orderBy('label')->get()
        );
    }

    public function store(StoreRecurringTemplateRequest $request): JsonResponse
    {
        $template = $request->user()->recurringTemplates()->create($request->validated());

        return (new RecurringTemplateResource($template->load(['account', 'category'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(StoreRecurringTemplateRequest $request, RecurringTemplate $recurringTemplate): RecurringTemplateResource
    {
        $this->authorize('update', $recurringTemplate);
        $recurringTemplate->update($request->validated());

        return new RecurringTemplateResource($recurringTemplate->load(['account', 'category']));
    }

    public function destroy(RecurringTemplate $recurringTemplate): JsonResponse
    {
        $this->authorize('delete', $recurringTemplate);
        $recurringTemplate->delete();

        return response()->json(['ok' => true]);
    }

    public function apply(Request $request, RecurringTemplate $recurringTemplate, ApplyRecurringTemplate $apply): TransactionResource
    {
        $this->authorize('update', $recurringTemplate);
        $data = $request->validate([
            'year_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $transaction = $apply->handle($request->user(), $recurringTemplate, $data['year_month']);

        return new TransactionResource($transaction->load(['account', 'category']));
    }
}
