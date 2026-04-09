export function random_secure_password(
  length: number = 12,
  include_confirmation: boolean = false,
): string | [string, string] {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const specialChars = "!@#$%^&*:;?><,./=";
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  let password = "";
  for (let i = 0; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  if (include_confirmation) {
    return [password, password];
  }
  return password;
}

export function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(
  min: number,
  max: number,
  decimals: number = 2,
): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

export function randomEmail(domain: string = "example.com"): string {
  const localPart = randomString(8).toLowerCase();
  return `${localPart}@${domain}`;
}

export function randomPhoneNumber(countryCode: string = "+84"): string {
  const digits = Array.from({ length: 9 }, () => randomInt(0, 9)).join("");
  return `${countryCode}${digits}`;
}

export function randomDate(
  start: Date = new Date(2000, 0, 1),
  end: Date = new Date(),
): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

export function randomDateString(
  start: Date = new Date(2000, 0, 1),
  end: Date = new Date(),
  format: "ISO" | "locale" = "ISO",
): string {
  const date = randomDate(start, end);
  return format === "ISO"
    ? date.toISOString().split("T")[0]
    : date.toLocaleDateString();
}

export function randomPickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export function randomFullName(): string {
  const firstNames = [
    "An",
    "Bình",
    "Cường",
    "Dung",
    "Hoa",
    "Hùng",
    "Lan",
    "Minh",
    "Nam",
    "Phương",
    "Quang",
    "Thảo",
    "Tuấn",
    "Vy",
    "Xuân",
  ];
  const lastNames = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Huỳnh",
    "Phan",
    "Vũ",
    "Đặng",
    "Bùi",
    "Đỗ",
    "Hồ",
    "Ngô",
    "Dương",
    "Lý",
  ];
  return `${randomPickFrom(lastNames)} ${randomPickFrom(firstNames)}`;
}

export function randomAddress(): string {
  const streets = [
    "Lý Thường Kiệt",
    "Nguyễn Huệ",
    "Trần Hưng Đạo",
    "Lê Lợi",
    "Đinh Tiên Hoàng",
    "Hai Bà Trưng",
    "Nguyễn Trãi",
  ];
  const districts = [
    "Quận 1",
    "Quận 3",
    "Quận 5",
    "Quận 7",
    "Bình Thạnh",
    "Tân Bình",
    "Gò Vấp",
  ];
  const houseNo = randomInt(1, 500);
  return `${houseNo} ${randomPickFrom(streets)}, ${randomPickFrom(districts)}, TP.HCM`;
}

export function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
