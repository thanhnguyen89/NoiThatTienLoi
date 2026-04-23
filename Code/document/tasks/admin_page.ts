/**
 * ============================================================
 * TASK: SEO Config Management
 * ============================================================
 */

// ============================================================
// 📋 METADATA
// ============================================================

export const TASK_METADATA = {
  taskName: 'admin-management',
  module: 'Page',
  type: 'feature',
  priority: 'high',
  source: 'screenshot',
  assignee: '',
  createdAt: '2026-04-02',
};

// ============================================================
// 🎯 MỤC TIÊU
// ============================================================

export const TASK_GOAL = `
Quản lý các trang tĩnh của website như: Giới thiệu, Liên hệ, Footer, Chính sách, Trang chủ...
Cho phép admin thêm/sửa/xóa trang
Cấu hình hiển thị trang trên site
Quản lý nội dung chi tiết, SEO và chuyển hướng cho từng trang
Hỗ trợ đánh dấu trang chủ hiển thị ẩn/hiện theo cấu hình
`;

// ============================================================
// 💾 DATABASE CHANGES
// ============================================================

export const DB_CHANGES = {
  schemaChange: false,

  /** Kiểm tra trước: xem model page đã tồn tại chưa */
  migrations: [],

  newModels: [],
};

// ============================================================
// 🔌 API CONTRACTS
// ============================================================
export const API_CONTRACTS = {
  "module": "page-management",
  "screen": "admin/page — form thêm/sửa trang",
  "analysis": {
    "ui_elements_found": {
      "left_panel_THÔNG_TIN": {
        "Tiêu đề": {
          "type": "text",
          "required": true,
          "maxLength": 60,
          "placeholder": "Nhập tiêu đề",
          "value": ""
        },
        "Tên hệ thống": {
          "type": "text",
          "required": true,
          "placeholder": "",
          "value": ""
        },
        "Thứ tự hiển thị": {
          "type": "number",
          "default": 0,
          "value": "0"
        },
        "Công khai": {
          "type": "checkbox",
          "checked": true
        },
        "Trang chủ (hiện/ẩn)": {
          "type": "checkbox",
          "checked": false
        },
        "Mô tả ngắn gọn": {
          "type": "textarea",
          "placeholder": "Nhập mô tả ngắn gọn",
          "value": ""
        },
        "Nội dung": {
          "type": "richtext",
          "toolbar": [
            "Tập tin",
            "Sửa",
            "Xem",
            "Chèn",
            "Định dạng",
            "Công cụ",
            "Bảng"
          ],
          "value": ""
        }
      },
      "right_panel_SEO": {
        "Tiêu đề SEO": {
          "type": "text",
          "maxLength": 60,
          "counter": "MISSING"
        },
        "Mô tả SEO": {
          "type": "textarea",
          "maxLength": 160,
          "counter": "MISSING"
        },
        "Từ khóa": {
          "type": "text",
          "value": ""
        },
        "URL": {
          "type": "text",
          "maxLength": 75,
          "counter": "MISSING"
        },
        "SEO Canonical": {
          "type": "text",
          "value": ""
        },
        "MD5 Keyword": {
          "type": "text",
          "value": ""
        },
        "SEO Noindex": {
          "type": "checkbox",
          "checked": false
        }
      },
      "right_panel_CHUYỂN_HƯỚNG": {
        "Chuyển hướng": {
          "type": "checkbox",
          "checked": false
        },
        "URL": {
          "type": "text",
          "maxLength": 75,
          "counter": "MISSING",
          "disabled": false
        },
        "Mã lỗi": {
          "type": "select",
          "placeholder": "Mã lỗi",
          "options": "MISSING"
        }
      }
    },
    "issues": [
      {
        "id": "ISSUE-001",
        "severity": "medium",
        "category": "UI_STYLE",
        "location": "Card panel (SEO + Chuyển hướng)",
        "description": "Card panel phải chưa giống UI gốc — cần đối chiếu lại style panel/card của admin gốc để đảm bảo nhất quán về border, shadow, header, spacing",
        "status": "open"
      },
      {
        "id": "ISSUE-002",
        "severity": "medium",
        "category": "UI_STYLE",
        "location": "Panel header",
        "description": "Header panel đang hiển thị thừa label — cần kiểm tra lại template header panel, loại bỏ label thừa không có trong thiết kế gốc",
        "status": "open"
      },
      {
        "id": "ISSUE-003",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "SEO fields (Tiêu đề, Mô tả, URL)",
        "description": "Thiếu counter ký tự realtime cho các field có giới hạn: Tiêu đề SEO (60), Mô tả SEO (160), URL (75). Yêu cầu HIGH specifies cần hiển thị counter realtime.",
        "status": "open"
      },
      {
        "id": "ISSUE-004",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "SEO + Chuyển hướng fields",
        "description": "Thiếu tooltip hoặc helper text cho các field SEO và chuyển hướng. Yêu cầu MEDIUM.",
        "status": "open"
      },
      {
        "id": "ISSUE-005",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "Form footer",
        "description": "Footer Lưu/Đóng chưa căn phải — nút Lưu và Đóng cần nằm cuối form, căn phải, luôn dễ thao tác. Yêu cầu HIGH.",
        "status": "open"
      },
      {
        "id": "ISSUE-006",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "Redirect fields",
        "description": "Khi bật checkbox 'Chuyển hướng', các field redirectUrl và redirectCode vẫn chưa được enable theo rule. Khi tắt chưa disable/clear. Yêu cầu HIGH.",
        "status": "open"
      },
      {
        "id": "ISSUE-007",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "Slug generation",
        "description": "Chưa thấy auto-generate slug từ title khi tạo mới trang. Yêu cầu trong FORM SCREEN BEHAVIOR.",
        "status": "open"
      },
      {
        "id": "ISSUE-008",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "Status display",
        "description": "Trạng thái bật/tắt chưa hiển thị dễ nhìn hơn — cần cải thiện visual cho checkbox/-toggle trạng thái. Yêu cầu MEDIUM.",
        "status": "open"
      },
      {
        "id": "ISSUE-009",
        "severity": "medium",
        "category": "UX",
        "location": "Spasing, alignment, responsive",
        "description": "Cần tối ưu spacing, alignment, responsive cho form — đảm bảo layout không bị vỡ trên các màn hình khác nhau. Yêu cầu MEDIUM.",
        "status": "open"
      },
      {
        "id": "ISSUE-010",
        "severity": "medium",
        "category": "MISSING_FEATURE",
        "location": "Validation display",
        "description": "Chưa thấy hiển thị validation error cho các field bắt buộc (Tiêu đề, Tên hệ thống) và các rule khác. Cần hiển thị lỗi rõ ràng trước khi submit.",
        "status": "open"
      }
    ],
    "fields_not_visible_in_screenshot": {
      "Thiếu validation message": "Chưa test submit nên chưa thấy UI validation errors",
      "Thiếu tooltip/helper": "Chưa thấy helper text cho SEO fields",
      "Thiếu redirect options": "Dropdown Mã lỗi chưa expand nên chưa thấy options 301/302"
    },
    "data_binding_status": {
      "Tiêu đề (title)": "string, empty — chưa bind",
      "Tên hệ thống (systemName)": "string, empty — chưa bind",
      "Thứ tự hiển thị (sortOrder)": "number, default 0 — OK",
      "Công khai (isPublished)": "boolean, checked=true — OK",
      "Trang chủ (isHomeVisible)": "boolean, checked=false — OK",
      "Mô tả ngắn gọn (summary)": "string, empty — chưa bind",
      "Nội dung (content)": "richtext, empty — chưa bind",
      "Tiêu đề SEO (seoTitle)": "string, empty — chưa bind",
      "Mô tả SEO (seoDescription)": "string, empty — chưa bind",
      "Từ khóa (seoKeywords)": "string, empty — chưa bind",
      "URL (slug)": "string, empty — chưa bind",
      "SEO Canonical (canonicalUrl)": "string, empty — chưa bind",
      "MD5 Keyword (md5Keyword)": "string, empty — chưa bind",
      "SEO NoIndex (seoNoIndex)": "boolean, checked=false — OK",
      "Chuyển hướng (isRedirect)": "boolean, checked=false — OK",
      "URL đích (redirectUrl)": "string, empty — chưa bind",
      "Mã lỗi (redirectCode)": "enum, placeholder — chưa bind"
    },
    "rules_compliance": {
      "required_fields_labeled": {
        "passed": true,
        "note": "Tiêu đề và Tên hệ thống có dấu (*)"
      },
      "redirect_validation": {
        "passed": false,
        "note": "Chưa implement logic enable/disable redirect fields theo checkbox"
      },
      "slug_normalization": {
        "passed": false,
        "note": "Chưa implement auto-generate slug từ title"
      },
      "char_counter": {
        "passed": false,
        "note": "Thiếu counter realtime cho SEO fields"
      },
      "home_page_unique_rule": {
        "passed": false,
        "note": "Chưa implement business rule chỉ cho phép 1 trang chủ"
      }
    }
  },
  "summary": {
    "fields_đã_có_UI": [
      "Tiêu đề",
      "Tên hệ thống",
      "Thứ tự hiển thị",
      "Công khai",
      "Trang chủ (hiện/ẩn)",
      "Mô tả ngắn gọn",
      "Nội dung (richtext)",
      "SEO fields (6 fields)",
      "Chuyển hướng fields (3 fields)"
    ],
    "fields_còn_thiếu_hoặc_chưa_đúng": [
      "Counter ký tự realtime",
      "Tooltip/helper text",
      "Validation error display",
      "Auto slug generation",
      "Redirect logic toggle",
      "Unique home page rule",
      "Footer Lưu/Đóng căn phải",
      "Child item green plus icon",
      "Status visual improvement",
      "Confirm delete dialog (chỉ thấy trên list)"
    ],
    "ui_issues": [
      "Panel style chưa giống gốc",
      "Panel header thừa label",
      "Spacing/alignment chưa tối ưu"
    ],
    "form_functionality": {
      "create_mode": "chưa test đầy đủ",
      "edit_mode": "chưa test đầy đủ",
      "validation": "chưa implement đầy đủ",
      "save_action": "chưa test",
      "redirect_toggle": "chưa implement"
    }
  }
};