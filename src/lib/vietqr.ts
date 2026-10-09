export interface BankInfo {
  id: string; // Short name or BIN, e.g. "BIDV" or "970418"
  name: string;
  bin: string;
  shortName: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { id: "BIDV", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", bin: "970418" },
  { id: "VCB", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", bin: "970436" },
  { id: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội", bin: "970422" },
  { id: "ICB", shortName: "VietinBank", name: "Ngân hàng TMCP Công Thương Việt Nam", bin: "970415" },
  { id: "TCB", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam", bin: "970407" },
  { id: "VPB", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", bin: "970432" },
  { id: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu", bin: "970416" },
  { id: "TPB", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", bin: "970423" },
  { id: "STB", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", bin: "970403" },
  { id: "VIB", shortName: "VIB", name: "Ngân hàng TMCP Quốc dân / VIB", bin: "970441" },
  { id: "HDB", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM", bin: "970437" },
  { id: "VBA", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn", bin: "970405" },
  { id: "MSB", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", bin: "970426" },
  { id: "LPB", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", bin: "970449" },
  { id: "SHB", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", bin: "970443" },
  { id: "SEAB", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", bin: "970440" },
  { id: "EIB", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", bin: "970431" },
  { id: "OCB", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông", bin: "970448" },
];

export const DEFAULT_BANK_ID = "BIDV";
export const DEFAULT_BANK_ACCOUNT_NO = "3130907350";
export const DEFAULT_BANK_ACCOUNT_NAME = "NGUYEN BAC KINH";
export const DEFAULT_VIETQR_TEMPLATE = "compact2";

export interface VietQRParams {
  bankId?: string | null;
  accountNo?: string | null;
  accountName?: string | null;
  template?: string | null;
  amount?: number | null;
  addInfo?: string | null;
}

export function generateVietQRUrl(params: VietQRParams): string {
  const bank = (params.bankId || DEFAULT_BANK_ID).trim();
  const accNo = (params.accountNo || DEFAULT_BANK_ACCOUNT_NO).trim();
  let template = (params.template || DEFAULT_VIETQR_TEMPLATE).trim();
  const accName = (params.accountName || DEFAULT_BANK_ACCOUNT_NAME).trim();

  const hasAmount = typeof params.amount === "number" && params.amount > 0;
  // compact2 template renders "Số tiền: 0 VND" when amount is omitted.
  // Automatically fallback to "compact" template when amount is off/0 to avoid showing 0đ.
  if (!hasAmount && template === "compact2") {
    template = "compact";
  }

  const baseUrl = `https://img.vietqr.io/image/${bank}-${accNo}-${template}.png`;
  const queryParams = new URLSearchParams();

  if (hasAmount) {
    queryParams.append("amount", Math.round(params.amount!).toString());
  }

  if (params.addInfo && params.addInfo.trim()) {
    queryParams.append("addInfo", params.addInfo.trim());
  }

  if (accName) {
    queryParams.append("accountName", accName);
  }

  const queryStr = queryParams.toString();
  return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
}
