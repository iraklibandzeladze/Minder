<?php

namespace App\Http\Controllers\Api;

use App\Actions\ManageFolders;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFolderRequest;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => Folder::where('user_id', $request->user()->id)->orderBy('name')->get()]);
    }

    public function store(StoreFolderRequest $request, ManageFolders $action): JsonResponse
    {
        return response()->json(['data' => $action->save($request->user(), $request->validated())], 201);
    }

    public function update(StoreFolderRequest $request, Folder $folder, ManageFolders $action): JsonResponse
    {
        $this->authorize('update', $folder);

        return response()->json(['data' => $action->save($request->user(), $request->validated(), $folder)]);
    }

    public function destroy(Request $request, Folder $folder, ManageFolders $action): JsonResponse
    {
        $this->authorize('delete', $folder);
        $data = $request->validate(['delete_contents' => ['required', 'boolean'], 'account_password' => ['nullable', 'string', 'max:255']]);
        $action->delete($request->user(), $folder, $data['delete_contents'], $data['account_password'] ?? null);

        return response()->json(['ok' => true]);
    }
}
