# 📚 Hướng dẫn Tạo Chức Năng CRUD trong Paperless-ngx

Tài liệu này hướng dẫn bạn tạo một chức năng CRUD mới (Create, Read, Update, Delete) trong Paperless-ngx từ backend đến frontend.

---

## 📋 Mục lục

1. [Cấu trúc Project](#cấu-trúc-project)
2. [Backend (Django)](#backend-django)
3. [Database Migration](#database-migration)
4. [Frontend (Angular)](#frontend-angular)
5. [Testing](#testing)
6. [Ví dụ Thực Tế](#ví-dụ-thực-tế)

---

## 🏗️ Cấu trúc Project

```
paperless-ngx/
├── src/                          # Backend Django
│   ├── documents/
│   │   ├── models.py            # Models
│   │   ├── serialisers.py       # Serializers
│   │   ├── views.py             # ViewSets
│   │   ├── filters.py           # Filters
│   │   ├── migrations/          # Database migrations
│   │   └── tests/
│   ├── paperless/
│   │   ├── urls.py              # URL routing
│   │   └── settings/
│   └── manage.py
│
└── src-ui/                       # Frontend Angular
    ├── src/app/
    │   ├── services/            # API Services
    │   ├── components/          # UI Components
    │   ├── app-routing.module.ts
    │   └── app.module.ts
    └── angular.json
```

---

## 🔧 Backend (Django)

### Bước 1: Tạo Model

**File:** `src/documents/models.py`

Thêm model mới vào cuối file:

```python
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _

class MyFeature(models.Model):
    """
    Model tùy chỉnh (ví dụ: Quản lý Tags mở rộng)
    """
    name = models.CharField(
        max_length=255,
        verbose_name=_("name"),
        help_text=_("Tên của feature")
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("description")
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("owner")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("is active")
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("created at")
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("updated at")
    )

    class Meta:
        verbose_name_plural = _("My Features")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'created_at']),
        ]

    def __str__(self):
        return self.name
```

**Ghi chú quan trọng:**

- Sử dụng `gettext_lazy` để support đa ngôn ngữ
- Thêm `help_text` cho mỗi field
- Đặt `ordering` và `indexes` để tối ưu hiệu năng
- Luôn có `created_at`, `updated_at` để tracking

---

### Bước 2: Tạo Serializer

**File:** `src/documents/serialisers.py`

Thêm serializer mới vào cuối file:

```python
class MyFeatureSerializer(serializers.ModelSerializer):
    """
    Serializer cho MyFeature model
    """
    owner_username = serializers.CharField(
        source='owner.username',
        read_only=True
    )

    class Meta:
        model = MyFeature
        fields = [
            'id',
            'name',
            'description',
            'owner',
            'owner_username',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'owner',
            'owner_username',
            'created_at',
            'updated_at',
        ]

    def validate_name(self, value):
        """Validate name field"""
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Name không được để trống")
        return value.strip()
```

**Ghi chú:**

- `read_only_fields` cho các field không cần edit
- Thêm custom fields như `owner_username` cho frontend dễ dùng
- Implement `validate_*` methods cho validation logic

---

### Bước 3: Tạo ViewSet

**File:** `src/documents/views.py`

Thêm ViewSet mới vào cuối file:

```python
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from documents.models import MyFeature
from documents.serialisers import MyFeatureSerializer

class MyFeatureViewSet(ModelViewSet):
    """
    API ViewSet cho MyFeature CRUD operations

    Endpoints:
    - GET    /api/my-features/              - List all
    - POST   /api/my-features/              - Create
    - GET    /api/my-features/{id}/         - Retrieve
    - PUT    /api/my-features/{id}/         - Update
    - PATCH  /api/my-features/{id}/         - Partial update
    - DELETE /api/my-features/{id}/         - Delete
    """
    queryset = MyFeature.objects.all()
    serializer_class = MyFeatureSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active', 'owner']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Chỉ hiển thị features của user hiện tại
        """
        return MyFeature.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        """
        Tự động set owner khi tạo mới
        """
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def active_only(self, request):
        """
        Custom endpoint: GET /api/my-features/active_only/
        Trả về chỉ các features đang active
        """
        features = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(features, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Custom endpoint: POST /api/my-features/{id}/toggle_active/
        Toggle trạng thái active/inactive
        """
        feature = self.get_object()
        feature.is_active = not feature.is_active
        feature.save()
        serializer = self.get_serializer(feature)
        return Response(serializer.data)
```

**Ghi chú:**

- `get_queryset()` để filter data theo user
- `perform_create()` để tự động set owner
- `@action` decorator cho custom endpoints
- `filterset_fields`, `search_fields` cho filtering

---

### Bước 4: Thêm URL Route

**File:** `src/paperless/urls.py`

Tìm section router và thêm:

```python
from rest_framework.routers import DefaultRouter
from documents.views import MyFeatureViewSet

router = DefaultRouter()
# ... existing registrations ...
router.register(r'my-features', MyFeatureViewSet, basename='my-feature')

urlpatterns = [
    # ... existing paths ...
] + router.urls
```

**Kết quả API endpoints:**

```
GET    /api/my-features/
GET    /api/my-features/active_only/
POST   /api/my-features/
GET    /api/my-features/{id}/
POST   /api/my-features/{id}/toggle_active/
PUT    /api/my-features/{id}/
PATCH  /api/my-features/{id}/
DELETE /api/my-features/{id}/
```

---

## 🗄️ Database Migration

Sau khi tạo model, cần tạo migration:

```bash
cd src

# Tạo migration file
uv run python manage.py makemigrations

# Kiểm tra migration trước khi apply
uv run python manage.py sqlmigrate documents 0XXX

# Apply migration
uv run python manage.py migrate
```

**Kiểm tra kết quả:**

```bash
# Kiểm tra database
uv run python manage.py dbshell
sqlite> .tables
sqlite> PRAGMA table_info(documents_myfeature);
```

---

## 🎨 Frontend (Angular)

### Bước 1: Tạo Service

**File:** `src-ui/src/app/services/my-feature.service.ts`

```typescript
import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'

export interface MyFeature {
  id: number
  name: string
  description?: string
  owner: number
  owner_username: string
  is_active: boolean
  created_at: string
  updated_at: string
}

@Injectable({
  providedIn: 'root',
})
export class MyFeatureService {
  private apiUrl = '/api/my-features'

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách tất cả features
   */
  getAll(params?: any): Observable<MyFeature[]> {
    let httpParams = new HttpParams()

    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] != null) {
          httpParams = httpParams.set(key, params[key])
        }
      })
    }

    return this.http.get<MyFeature[]>(this.apiUrl, { params: httpParams })
  }

  /**
   * Lấy chi tiết một feature
   */
  getById(id: number): Observable<MyFeature> {
    return this.http.get<MyFeature>(`${this.apiUrl}/${id}/`)
  }

  /**
   * Tạo feature mới
   */
  create(data: Partial<MyFeature>): Observable<MyFeature> {
    return this.http.post<MyFeature>(this.apiUrl + '/', data)
  }

  /**
   * Cập nhật feature
   */
  update(id: number, data: Partial<MyFeature>): Observable<MyFeature> {
    return this.http.put<MyFeature>(`${this.apiUrl}/${id}/`, data)
  }

  /**
   * Cập nhật một phần (partial update)
   */
  partialUpdate(id: number, data: Partial<MyFeature>): Observable<MyFeature> {
    return this.http.patch<MyFeature>(`${this.apiUrl}/${id}/`, data)
  }

  /**
   * Xóa feature
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`)
  }

  /**
   * Lấy chỉ features đang active
   */
  getActiveOnly(): Observable<MyFeature[]> {
    return this.http.get<MyFeature[]>(`${this.apiUrl}/active_only/`)
  }

  /**
   * Toggle active status
   */
  toggleActive(id: number): Observable<MyFeature> {
    return this.http.post<MyFeature>(`${this.apiUrl}/${id}/toggle_active/`, {})
  }
}
```

---

### Bước 2: Tạo Components

Tạo thư mục và components:

```bash
ng generate component components/my-feature/my-feature-list
ng generate component components/my-feature/my-feature-detail
ng generate component components/my-feature/my-feature-form
```

#### **my-feature-list.component.ts**

**File:** `src-ui/src/app/components/my-feature/my-feature-list/my-feature-list.component.ts`

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import {
  MyFeatureService,
  MyFeature,
} from '../../../services/my-feature.service'

@Component({
  selector: 'app-my-feature-list',
  templateUrl: './my-feature-list.component.html',
  styleUrls: ['./my-feature-list.component.scss'],
})
export class MyFeatureListComponent implements OnInit, OnDestroy {
  features: MyFeature[] = []
  loading = false
  error: string | null = null
  private destroy$ = new Subject<void>()

  constructor(
    private service: MyFeatureService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeatures()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadFeatures(): void {
    this.loading = true
    this.error = null

    this.service
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.features = data
          this.loading = false
        },
        error: (err) => {
          this.error = 'Lỗi khi tải dữ liệu'
          console.error(err)
          this.loading = false
        },
      })
  }

  viewDetail(id: number): void {
    this.router.navigate(['/my-features', id])
  }

  createNew(): void {
    this.router.navigate(['/my-features/new'])
  }

  delete(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
      this.service
        .delete(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadFeatures()
          },
          error: (err) => {
            this.error = 'Lỗi khi xóa'
            console.error(err)
          },
        })
    }
  }

  toggleActive(feature: MyFeature): void {
    this.service
      .toggleActive(feature.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          feature.is_active = updated.is_active
        },
        error: (err) => {
          console.error(err)
        },
      })
  }
}
```

#### **my-feature-list.component.html**

**File:** `src-ui/src/app/components/my-feature/my-feature-list/my-feature-list.component.html`

```html
<div class="my-feature-list">
  <div class="header">
    <h1>Quản Lý Features</h1>
    <button (click)="createNew()" class="btn btn-primary">+ Tạo Mới</button>
  </div>

  <div *ngIf="error" class="alert alert-error">{{ error }}</div>

  <div *ngIf="loading" class="loading">Đang tải dữ liệu...</div>

  <table *ngIf="!loading && features.length > 0" class="table">
    <thead>
      <tr>
        <th>Tên</th>
        <th>Mô Tả</th>
        <th>Trạng Thái</th>
        <th>Tạo Lúc</th>
        <th>Hành Động</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let feature of features">
        <td>{{ feature.name }}</td>
        <td>{{ feature.description }}</td>
        <td>
          <label class="toggle">
            <input
              type="checkbox"
              [checked]="feature.is_active"
              (change)="toggleActive(feature)"
            />
            <span class="slider"></span>
          </label>
        </td>
        <td>{{ feature.created_at | date:'short' }}</td>
        <td>
          <button (click)="viewDetail(feature.id)" class="btn btn-sm btn-info">
            Chi Tiết
          </button>
          <button (click)="delete(feature.id)" class="btn btn-sm btn-danger">
            Xóa
          </button>
        </td>
      </tr>
    </tbody>
  </table>

  <div *ngIf="!loading && features.length === 0" class="empty">
    Chưa có dữ liệu
  </div>
</div>
```

#### **my-feature-form.component.ts**

**File:** `src-ui/src/app/components/my-feature/my-feature-form/my-feature-form.component.ts`

```typescript
import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import {
  MyFeatureService,
  MyFeature,
} from '../../../services/my-feature.service'

@Component({
  selector: 'app-my-feature-form',
  templateUrl: './my-feature-form.component.html',
  styleUrls: ['./my-feature-form.component.scss'],
})
export class MyFeatureFormComponent implements OnInit {
  form!: FormGroup
  loading = false
  error: string | null = null
  isEdit = false
  featureId?: number

  constructor(
    private fb: FormBuilder,
    private service: MyFeatureService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm()
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id'] && params['id'] !== 'new') {
        this.isEdit = true
        this.featureId = params['id']
        this.loadFeature()
      }
    })
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      is_active: [true],
    })
  }

  loadFeature(): void {
    if (!this.featureId) return

    this.loading = true
    this.service.getById(this.featureId).subscribe({
      next: (feature) => {
        this.form.patchValue(feature)
        this.loading = false
      },
      error: (err) => {
        this.error = 'Lỗi khi tải dữ liệu'
        this.loading = false
      },
    })
  }

  submit(): void {
    if (!this.form.valid) return

    this.loading = true
    const data = this.form.value

    const request =
      this.isEdit && this.featureId
        ? this.service.update(this.featureId, data)
        : this.service.create(data)

    request.subscribe({
      next: () => {
        this.router.navigate(['/my-features'])
      },
      error: (err) => {
        this.error = 'Lỗi khi lưu dữ liệu'
        console.error(err)
        this.loading = false
      },
    })
  }

  cancel(): void {
    this.router.navigate(['/my-features'])
  }
}
```

---

### Bước 3: Thêm Routes

**File:** `src-ui/src/app/app-routing.module.ts`

```typescript
const routes: Routes = [
  // ... existing routes ...
  {
    path: 'my-features',
    children: [
      {
        path: '',
        component: MyFeatureListComponent,
      },
      {
        path: ':id',
        component: MyFeatureFormComponent,
      },
    ],
  },
]
```

---

### Bước 4: Import Components

**File:** `src-ui/src/app/app.module.ts`

```typescript
import { MyFeatureListComponent } from './components/my-feature/my-feature-list/my-feature-list.component'
import { MyFeatureFormComponent } from './components/my-feature/my-feature-form/my-feature-form.component'

@NgModule({
  declarations: [
    // ... existing components ...
    MyFeatureListComponent,
    MyFeatureFormComponent,
  ],
  // ...
})
export class AppModule {}
```

---

## ✅ Testing

### Backend Test

**File:** `src/documents/tests/test_my_feature.py`

```python
from django.test import TestCase
from django.contrib.auth.models import User
from documents.models import MyFeature

class MyFeatureTestCase(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_create_feature(self):
        feature = MyFeature.objects.create(
            name='Test Feature',
            description='Test Description',
            owner=self.user
        )
        self.assertEqual(feature.name, 'Test Feature')
        self.assertTrue(feature.is_active)

    def test_feature_str(self):
        feature = MyFeature.objects.create(
            name='Test Feature',
            owner=self.user
        )
        self.assertEqual(str(feature), 'Test Feature')
```

**Chạy test:**

```bash
cd src
uv run python manage.py test documents.tests.test_my_feature
```

---

## 📝 Ví dụ Thực Tế

### Tham khảo Models Hiện Tại:

- **Document Model:** `src/documents/models.py` - Class `Document`
- **Correspondent Model:** `src/documents/models.py` - Class `Correspondent`
- **Tag Model:** `src/documents/models.py` - Class `Tag`

### Tham khảo ViewSets:

- **DocumentViewSet:** `src/documents/views.py`
- **CorrespondentViewSet:** `src/documents/views.py`

### Tham khảo Frontend Components:

- **Document List:** `src-ui/src/app/components/document-list/`
- **Document Detail:** `src-ui/src/app/components/document-detail/`

---

## 🚀 Checklist Hoàn Chỉnh

### Backend:

- [ ] Tạo Model trong `models.py`
- [ ] Tạo Serializer trong `serialisers.py`
- [ ] Tạo ViewSet trong `views.py`
- [ ] Thêm URL route trong `urls.py`
- [ ] Tạo migration file: `makemigrations`
- [ ] Apply migration: `migrate`
- [ ] Viết unit tests
- [ ] Test API endpoints với Postman/curl

### Frontend:

- [ ] Tạo Service
- [ ] Tạo Component List
- [ ] Tạo Component Form/Detail
- [ ] Thêm Routes
- [ ] Import Components trong App Module
- [ ] Test UI trong browser

### Deployment:

- [ ] Commit code vào Git
- [ ] Review changes
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify trên production

---

## 🔗 Tài Liệu Tham Khảo

- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [Angular Official Docs](https://angular.io/docs)
- [Django Models](https://docs.djangoproject.com/en/5.0/topics/db/models/)
- [Django ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/)

---

**Chúc bạn phát triển thành công!** 🎉
