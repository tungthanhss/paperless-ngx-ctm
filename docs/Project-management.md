# Project Management

Project Management là khu vực quản lý công việc theo workspace và project trong
paperless-ngx. Tính năng này phục vụ các nhóm cần theo dõi yêu cầu nội bộ, task,
chu kỳ làm việc, module và ghi chú dự án ngay trong hệ thống.

## Tổng quan

Mỗi workspace đại diện cho một không gian làm việc chung, ví dụ một phòng ban
hoặc một nhóm vận hành. Bên trong workspace có nhiều project. Mỗi project có
workflow riêng, nhãn riêng, chu kỳ riêng, module riêng và danh sách task riêng.

Luồng sử dụng cơ bản:

1. Tạo workspace.
2. Tạo project trong workspace.
3. Tạo các state cho workflow của project, ví dụ `Backlog`, `In Progress`,
   `Review`, `Done`.
4. Đặt một state làm mặc định để task mới tự động đi vào state đó.
5. Tạo task bằng form thông thường hoặc ô quick add.
6. Theo dõi tiến độ bằng board, list, cycle, module và intake request.

## Truy cập giao diện

Giao diện nằm trong khu vực quản trị của ứng dụng tại mục
**Manage > Quản lý công việc**. Menu này có các màn hình con riêng thay vì gộp
tất cả vào một màn hình.

Các màn hình hiện có:

- **Thống kê**: hiển thị số workspace, project, task, task hoàn tất, task đang
  mở, task quá hạn và intake request đang mở.
- **Workspace**: tạo và xem danh sách workspace.
- **Project**: tạo và xem project theo workspace.
- **Workflow state**: tạo state, đánh dấu state mặc định và state hoàn tất.
- **Task**: quick add task, xem board/list, chuyển task giữa các state và chỉnh
  priority.
- **Kế hoạch**: quản lý cycle, module và rollover task giữa các cycle.
- **Intake**: tạo, accept hoặc decline intake request.
- **Pages**: tạo và xem page thuộc project.

## Mô hình dữ liệu

### Workspace

Workspace là cấp cao nhất của tính năng Project Management.

Trường chính:

- `name`: tên workspace.
- `description`: mô tả.
- `owner`: người tạo workspace.
- `members`: người dùng có quyền truy cập workspace.
- `settings`: cấu hình mở rộng dạng JSON.

Người tạo workspace được tự động thêm vào `members`.

### Project

Project thuộc một workspace và là nơi chứa workflow, task, planning và intake.

Trường chính:

- `workspace`: workspace chứa project.
- `name`: tên project.
- `key`: mã project, được chuẩn hóa thành chữ hoa.
- `description`: mô tả.
- `owner`: người tạo project.
- `lead`: người phụ trách project.
- `members`: thành viên project.

`key` phải dài từ 1 đến 16 ký tự và chỉ dùng chữ hoa, số, dấu gạch dưới hoặc dấu
gạch ngang. Mỗi workspace không được có hai project trùng `key`.

### Project State

State định nghĩa các bước trong workflow của project.

Trường chính:

- `name`: tên state.
- `position`: thứ tự hiển thị trên board.
- `is_default`: state mặc định cho task mới.
- `is_completed`: state được tính là hoàn tất.

Trong một project chỉ có một state mặc định. Khi đặt state mới là mặc định, các
state còn lại trong cùng project sẽ được bỏ cờ `is_default`.

Khi task được chuyển vào state có `is_completed = true`, hệ thống tự gán
`completed_at`. Khi task rời khỏi state hoàn tất, `completed_at` được xóa.

### Project Label

Label dùng để phân loại task trong phạm vi một project.

Trường chính:

- `name`: tên label.
- `color`: màu dạng `#RRGGBB`.

Tên label là duy nhất trong từng project.

### Project Task

Task là đơn vị công việc chính.

Trường chính:

- `title`: tiêu đề.
- `description`: mô tả.
- `assignee`: người phụ trách.
- `created_by`: người tạo.
- `state`: trạng thái hiện tại.
- `priority`: `urgent`, `high`, `medium` hoặc `low`.
- `labels`: các label của task.
- `cycle`: cycle chứa task.
- `module`: module chứa task.
- `estimate`: ước lượng công việc.
- `due_date`: hạn xử lý.
- `completed_at`: thời điểm hoàn tất.

Các liên kết `state`, `cycle`, `module` và `labels` phải thuộc cùng project với
task.

### Project Cycle

Cycle đại diện cho một khoảng thời gian làm việc, tương tự sprint hoặc tuần vận
hành.

Trường chính:

- `name`: tên cycle.
- `starts_at`: ngày bắt đầu.
- `ends_at`: ngày kết thúc.
- `is_active`: cycle còn đang hoạt động hay không.
- `completed_issues`: số task đã hoàn tất.
- `total_issues`: tổng số task trong cycle.
- `progress`: phần trăm hoàn tất.

`ends_at` phải lớn hơn hoặc bằng `starts_at`.

Cycle có thao tác `rollover` để chuyển các task chưa hoàn tất sang cycle tiếp
theo. Task đã nằm trong state hoàn tất sẽ ở lại cycle cũ, và cycle cũ được đặt
`is_active = false`.

### Project Module

Module gom nhóm task theo mục tiêu dài hạn, mốc triển khai hoặc phạm vi chức
năng.

Trường chính:

- `name`: tên module.
- `description`: mô tả.
- `target_date`: ngày mục tiêu.
- `completed_issues`: số task đã hoàn tất.
- `total_issues`: tổng số task trong module.
- `progress`: phần trăm hoàn tất.

### Intake Request

Intake request là cổng tiếp nhận yêu cầu trước khi biến yêu cầu thành task chính
thức.

Trường chính:

- `title`: tiêu đề yêu cầu.
- `description`: mô tả.
- `requester`: người gửi yêu cầu.
- `source_department`: phòng ban hoặc nguồn gửi.
- `status`: `open`, `accepted` hoặc `declined`.
- `review_comment`: ghi chú khi duyệt hoặc từ chối.
- `accepted_issue`: task được tạo khi yêu cầu được chấp nhận.

Chỉ request ở trạng thái `open` mới có thể được accept hoặc decline. Khi accept,
hệ thống tạo một task mới từ `title` và `description` của request, dùng state
mặc định của project nếu có.

### Project Page

Project page là ghi chú hoặc tài liệu nội bộ thuộc project.

Trường chính:

- `title`: tiêu đề trang.
- `content`: nội dung dạng JSON.
- `created_by`: người tạo.

Mỗi project không được có hai page trùng `title`.

## Quick add task

Ô quick add tạo task từ một dòng văn bản:

```text
Reset laptop access #it @alex
```

Kết quả:

- Task title: `Reset laptop access`.
- Label: `it`.
- Assignee: user có username `alex`, nếu tồn tại.
- State: state mặc định của project, nếu project đã cấu hình.

Các token bắt đầu bằng `#` được tạo hoặc gắn vào label của project. Token bắt đầu
bằng `@` được dùng để tìm assignee theo username. Nếu username không tồn tại,
task vẫn được tạo nhưng không có assignee.

## Planning

Tab Planning quản lý hai nhóm dữ liệu:

- **Cycles**: các khoảng thời gian làm việc có ngày bắt đầu, ngày kết thúc và
  tiến độ.
- **Modules**: các nhóm mục tiêu có ngày mục tiêu và tiến độ.

Để rollover một cycle:

1. Tạo cycle hiện tại và cycle kế tiếp.
2. Gán task vào cycle hiện tại.
3. Trong danh sách cycle, chọn cycle kế tiếp.
4. Chọn **Rollover**.

Hệ thống chỉ chuyển task chưa hoàn tất. Số lượng task được chuyển sẽ được hiển
thị sau khi thao tác thành công.

## Intake workflow

Tab Intake dùng cho các yêu cầu cần được xem xét trước khi đưa vào backlog.

Luồng xử lý:

1. Người dùng tạo request với title, department và description.
2. Người phụ trách xem request đang `open`.
3. Nếu request phù hợp, chọn **Accept** để tạo task.
4. Nếu request không phù hợp, chọn **Decline**.
5. Có thể thêm review comment khi accept hoặc decline.

Request đã `accepted` hoặc `declined` không thể được duyệt lại bằng endpoint hiện
tại.

## API

Các endpoint đều yêu cầu đăng nhập và dùng phân trang chuẩn của API.
Trong giao diện và tài liệu nghiệp vụ, đơn vị công việc được gọi là task. Tên
endpoint và một số field API vẫn dùng `issue` để tương thích với backend hiện
tại.

| Resource       | Endpoint                |
| -------------- | ----------------------- |
| Workspace      | `/api/workspaces/`      |
| Project        | `/api/projects/`        |
| State          | `/api/project_states/`  |
| Label          | `/api/project_labels/`  |
| Cycle          | `/api/project_cycles/`  |
| Module         | `/api/project_modules/` |
| Task           | `/api/project_issues/`  |
| Intake request | `/api/intake_requests/` |
| Page           | `/api/project_pages/`   |

Các resource hỗ trợ thao tác REST thông thường: list, create, retrieve, update,
partial update và delete.

Action riêng:

| Action            | Method | Endpoint                                | Mục đích                                  |
| ----------------- | ------ | --------------------------------------- | ----------------------------------------- |
| Set default state | `POST` | `/api/project_states/{id}/set_default/` | Đặt state mặc định của project            |
| Quick add task    | `POST` | `/api/project_issues/quick_add/`        | Tạo task từ text                          |
| Rollover cycle    | `POST` | `/api/project_cycles/{id}/rollover/`    | Chuyển task chưa hoàn tất sang cycle khác |
| Accept intake     | `POST` | `/api/intake_requests/{id}/accept/`     | Chấp nhận request và tạo task             |
| Decline intake    | `POST` | `/api/intake_requests/{id}/decline/`    | Từ chối request                           |

Ví dụ quick add:

```http
POST /api/project_issues/quick_add/
Content-Type: application/json

{
  "project": 12,
  "text": "Reset laptop access #it @alex"
}
```

Ví dụ rollover:

```http
POST /api/project_cycles/4/rollover/
Content-Type: application/json

{
  "next_cycle": 5
}
```

## Quyền truy cập

Người dùng có quyền xem workspace khi là `owner` hoặc nằm trong `members` của
workspace.

Người dùng có quyền xem project khi thỏa một trong các điều kiện sau:

- Là `owner` của project.
- Là `lead` của project.
- Nằm trong `members` của project.
- Là `owner` của workspace chứa project.
- Nằm trong `members` của workspace chứa project.

Khi tạo workspace, người tạo được đặt làm owner và được thêm vào members. Khi tạo
project, người tạo được đặt làm owner, được thêm vào members, và trở thành lead
nếu payload không truyền lead.

## Lọc, sắp xếp và tìm kiếm

Các endpoint hỗ trợ lọc theo các trường chính:

- Project: `workspace`, `lead`.
- State: `project`, `is_default`, `is_completed`.
- Label: `project`.
- Cycle: `project`, `is_active`.

Các endpoint cũng hỗ trợ search theo tên, tiêu đề hoặc mô tả tùy resource, và
ordering theo các trường được khai báo trong API.

## Ghi chú triển khai hiện tại

- Board hiện tại cho phép chuyển task giữa các state bằng các nút trong từng
  card task.
- List hiện tại hỗ trợ chỉnh priority nhanh.
- Planning hiện tại tạo cycle, module và rollover cycle.
- Intake hiện tại tạo request, accept và decline request.
- Pages hiện tại tạo và liệt kê page; phần editor nội dung chi tiết chưa được
  mở rộng trên giao diện hiện tại.
- Project Management chưa cung cấp realtime collaboration, Command K menu, Gantt,
  calendar view hoặc tích hợp Slack/GitHub/GitLab/Google Calendar trong triển
  khai hiện tại.
