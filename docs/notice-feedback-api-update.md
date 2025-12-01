# Notice Feedback API update

The admin feedback list now sends the following optional query parameters whenever data is fetched or exported:

| Param          | Type    | Description                                          |
|----------------|---------|------------------------------------------------------|
| `search`       | string  | Keyword that matches employee/department/company     |
| `company`      | string  | Exact company name selected in the filter            |
| `department`   | string  | Exact department name selected in the filter         |
| `start_date`   | date    | ISO date (YYYY-MM-DD) for the "From date" filter     |
| `end_date`     | date    | ISO date (YYYY-MM-DD) for the "To date" filter       |
| `has_feedback` | boolean | `true` when "Only entries with written feedback" set |
| `page`         | number  | Pagination page (defaults to 1)                      |
| `per_page`     | number  | Page size (10/20/50/100)                             |

Update the `getNoticeFeedback` action so it respects the extra filters before pagination/excel export:

```php
public function getNoticeFeedback(Request $request, Notice $notice)
{
    $assignedEmployeeIds = $notice->getAssignedEmployeeIds();

    $query = User::query()
        ->with([
            'department:id,name',
            'company:id,name',
            'noticeFeedback' => function ($q) use ($notice) {
                $q->where('notice_id', $notice->id);
            },
        ])
        ->whereIn('id', $assignedEmployeeIds)
        ->withFeedbackOrder($notice->id);

    if ($request->filled('search')) {
        $search = $request->search;
        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhereHas('department', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })
                ->orWhereHas('company', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                });
        });
    }

    if ($request->filled('company')) {
        $query->whereHas('company', function ($q) use ($request) {
            $q->where('name', $request->company);
        });
    }

    if ($request->filled('department')) {
        $query->whereHas('department', function ($q) use ($request) {
            $q->where('name', $request->department);
        });
    }

    if ($request->boolean('has_feedback')) {
        $query->whereHas('noticeFeedback', function ($q) use ($notice) {
            $q->where('notice_id', $notice->id)
                ->whereNotNull('feedback');
        });
    }

    if ($request->filled('start_date')) {
        $query->whereHas('noticeFeedback', function ($q) use ($request, $notice) {
            $q->where('notice_id', $notice->id)
                ->whereDate('submitted_at', '>=', $request->start_date);
        });
    }

    if ($request->filled('end_date')) {
        $query->whereHas('noticeFeedback', function ($q) use ($request, $notice) {
            $q->where('notice_id', $notice->id)
                ->whereDate('submitted_at', '<=', $request->end_date);
        });
    }

    if ($request->flag === 'excel') {
        $employees = $query->get();
        return Excel::download(new NoticeFeedbackExport($employees), 'notice-feedbacks.xlsx');
    }

    $employees = $query->latest()->paginate($request->get('per_page', 20));

    return NoticeFeedbackEmployeeResource::collection($employees)->additional([
        'success' => true,
        'message' => 'Notice feedbacks retrieved successfully.',
    ]);
}
```

The resource now stays in sync with the UI filters, and the Excel export receives the same constraints by reusing the identical query parameters.
