import type { CommentBrandStyle } from './types';

interface BrandBlock {
  shopName: string;
  brandPronouns: string;
  mainProducts: string;
  brandAudience: string;
  brandToneNotes: string;
  brandForbidden: string;
}

const STYLE_INSTRUCTIONS: Record<CommentBrandStyle, string> = {
  funny: 'Vui ve, hai huoc nhe. Duoc dung emoji vua phai, khong lam qua.',
  friendly: 'Than thien, am ap, ung ho bai post nhu khach that.',
  casual: 'Thoai mai, doi thuong, cau ngan nhu dang noi chuyen tren Facebook.',
  professional: 'Nhan xet co chieu sau, gon gang, khong dung emoji thua.',
  creative: 'Goc nhin moi, tu nhien, tranh cau khen chung chung.',
  shorten: 'Rat ngan, toi da 1-2 cau, di thang vao y.',
  curious: 'Nguoi binh luan hoi them ve gia, kich thuoc, mau sac, giao hang, con hang, bao hanh. Moi comment hoi mot y cu the.',
  experience: 'Nguoi da mua hoac da dung san pham chia se trai nghiem that: thoi gian dung, giao hang, do chac, diem thich.',
  tag_friend: 'Comment dang tag ban be. Dung @... thay ten that, vi du "@... coi cai nay hop phong minh ne".',
};

function buildBrandBlock(brand: BrandBlock): string {
  const lines = [
    '## Thong tin thuong hieu',
    `- Ten shop: ${brand.shopName}`,
    `- Cach xung ho: ${brand.brandPronouns}`,
    `- San pham chinh: ${brand.mainProducts}`,
    `- Khach hang muc tieu: ${brand.brandAudience}`,
  ];

  if (brand.brandToneNotes) lines.push(`- Giong thuong hieu: ${brand.brandToneNotes}`);
  if (brand.brandForbidden) lines.push(`- Tu/cum tu can tranh: ${brand.brandForbidden}`);

  return lines.join('\n');
}

export interface BuildCommentBrandPromptInput {
  postContent: string;
  count: number;
  style: CommentBrandStyle;
  language: string;
  brand: BrandBlock;
}

export function buildCommentBrandPrompt(input: BuildCommentBrandPromptInput): string {
  const styleInstruction = STYLE_INSTRUCTIONS[input.style] || STYLE_INSTRUCTIONS.friendly;

  return `
Ban la AI tao comment Facebook tu nhien cho thuong hieu noi that.

${buildBrandBlock(input.brand)}

## Bai post Facebook can tao comment
${input.postContent}

## Yeu cau
- Tao dung ${input.count} comment khac nhau.
- Ngon ngu: ${input.language}.
- Phong cach: ${styleInstruction}
- Comment phai nghe nhu nguoi dung Facebook that, khong giong bot, khong giong quang cao.
- Phu hop voi noi that, giuong, tu, ban ghe, phong tro, gia dinh, homestay neu bai post co lien quan.
- Moi comment co mot goc nhin rieng, khong lap y.
- Do dai tu nhien: 1-3 cau. Rieng style sieu ngan thi 1 cau.
- Khong dung cac tu "binh luan", "comment", "post" trong noi dung comment.
${input.brand.brandForbidden ? `- Tuyet doi tranh: ${input.brand.brandForbidden}` : ''}

## Format output bat buoc
1. [noi dung comment 1]
2. [noi dung comment 2]
...
${input.count}. [noi dung comment ${input.count}]

Chi tra ve danh sach so thu tu, khong giai thich.
`.trim();
}
