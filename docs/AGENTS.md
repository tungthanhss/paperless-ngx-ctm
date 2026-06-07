# AGENTS.md

File nay dung de ghi huong dan lam viec cho AI/coding agent khi thao tac trong thu muc `docs`.

# Docs Agent

## Muc tieu

- Cap nhat tai lieu ro rang, ngan gon va dung voi code hien tai.

## Quy tac

- Khong sua noi dung ngoai pham vi yeu cau.
- Không cần viết unit test khi viết code
- Xong phần nào cần update lại document phần đó
- Code xong bỏ qua bước kiểm tra lint cho frontend
- luôn kiểm tra fe bằng lệnh duy nhất ng build --configuration development

## Lenh thuong dung

```bash
rg "tu-khoa" docs
```

## Cach kiem tra

- Doc lai file Markdown vua sua.
- Kiem tra link noi bo va code block neu co.
- Các màn hình tạo mới sẽ được hiển thị theo dạng modal khi người dùng ấn nút tạo mới trên màn hình danh sách tìm kiêm
- Check lỗi FE theo command pnpm exec tsc -p tsconfig.app.json --noEmit
- chỉ check trên nhưng file sửa và bổ sung vi du
  ```
  pnpm exec eslint 'src/app/components/manage/project-management/**/*.ts' 'src/app/app-routing.module.ts
  ```

## Ghi chu

- File `AGENTS.md` co hieu luc cho thu muc chua no va cac thu muc con.
- Neu co file `AGENTS.md` khac o thu muc con, file gan hon se uu tien hon.
- Nen viet quy tac ngan, ro, co the thuc hien duoc.
