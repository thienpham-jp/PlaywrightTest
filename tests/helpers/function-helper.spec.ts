import { test, expect } from "@playwright/test";
import {
  random_secure_password,
  randomString,
  randomInt,
  randomFloat,
  randomBoolean,
  randomEmail,
  randomPhoneNumber,
  randomDate,
  randomDateString,
  randomArrayElement,
  randomSample,
  randomFullName,
  randomAddress,
  randomUUID,
} from "../../src/helpers/function-helper";

test.describe("function-helper", () => {
  test.describe("random_secure_password", () => {
    test("trả về string với độ dài mặc định 12", () => {
      const pwd = random_secure_password() as string;
      console.log("[random_secure_password] default (length=12):", pwd);
      expect(typeof pwd).toBe("string");
      expect(pwd.length).toBe(12);
    });

    test("trả về string với độ dài tùy chỉnh", () => {
      const pwd = random_secure_password(20) as string;
      console.log("[random_secure_password] length=20:", pwd);
      expect(pwd.length).toBe(20);
    });

    test("trả về tuple [password, password] khi include_confirmation = true", () => {
      const result = random_secure_password(12, true) as [string, string];
      console.log("[random_secure_password] with confirmation:", result);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBe(result[1]);
    });
  });

  test.describe("randomString", () => {
    test("trả về string với đúng độ dài yêu cầu", () => {
      const s10 = randomString(10);
      const s1 = randomString(1);
      const s50 = randomString(50);
      console.log("[randomString] length=10:", s10);
      console.log("[randomString] length=1:", s1);
      console.log("[randomString] length=50:", s50);
      expect(s10.length).toBe(10);
      expect(s1.length).toBe(1);
      expect(s50.length).toBe(50);
    });

    test("chỉ chứa ký tự alphanumeric", () => {
      const result = randomString(100);
      console.log("[randomString] alphanumeric sample:", result);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  test.describe("randomInt", () => {
    test("trả về số nguyên trong khoảng [min, max]", () => {
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const val = randomInt(1, 10);
        samples.push(val);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(10);
        expect(Number.isInteger(val)).toBe(true);
      }
      console.log("[randomInt] 50 samples (1-10):", samples.join(", "));
    });

    test("hoạt động đúng khi min = max", () => {
      const val = randomInt(5, 5);
      console.log("[randomInt] min=max=5:", val);
      expect(val).toBe(5);
    });
  });

  test.describe("randomFloat", () => {
    test("trả về số thực trong khoảng [min, max]", () => {
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const val = randomFloat(0, 100);
        samples.push(val);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
      console.log(
        "[randomFloat] 10 samples (0-100):",
        samples.slice(0, 10).join(", "),
      );
    });

    test("số chữ số thập phân đúng với tham số decimals", () => {
      const val = randomFloat(0, 10, 3);
      console.log("[randomFloat] decimals=3:", val);
      const decimalPart = val.toString().split(".")[1] ?? "";
      expect(decimalPart.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe("randomBoolean", () => {
    test("chỉ trả về true hoặc false", () => {
      const samples: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        const val = randomBoolean();
        samples.push(val);
        expect(typeof val).toBe("boolean");
      }
      console.log("[randomBoolean] 20 samples:", samples.join(", "));
    });
  });

  test.describe("randomEmail", () => {
    test("trả về email hợp lệ với domain mặc định", () => {
      const email = randomEmail();
      console.log("[randomEmail] default domain:", email);
      expect(email).toMatch(/^[a-z0-9]+@example\.com$/);
    });

    test("trả về email với domain tùy chỉnh", () => {
      const email = randomEmail("test.vn");
      console.log("[randomEmail] domain=test.vn:", email);
      expect(email).toMatch(/^[a-z0-9]+@test\.vn$/);
    });
  });

  test.describe("randomPhoneNumber", () => {
    test("trả về số điện thoại với country code mặc định +84", () => {
      const phone = randomPhoneNumber();
      console.log("[randomPhoneNumber] default (+84):", phone);
      expect(phone).toMatch(/^\+84\d{9}$/);
    });

    test("trả về số điện thoại với country code tùy chỉnh", () => {
      const phone = randomPhoneNumber("+1");
      console.log("[randomPhoneNumber] countryCode=+1:", phone);
      expect(phone).toMatch(/^\+1\d{9}$/);
    });
  });

  test.describe("randomDate", () => {
    test("trả về đối tượng Date", () => {
      const d = randomDate();
      console.log("[randomDate] default:", d.toISOString());
      expect(d).toBeInstanceOf(Date);
    });

    test("ngày nằm trong khoảng [start, end]", () => {
      const start = new Date(2020, 0, 1);
      const end = new Date(2023, 11, 31);
      const samples: string[] = [];
      for (let i = 0; i < 20; i++) {
        const d = randomDate(start, end);
        samples.push(d.toISOString().split("T")[0]);
        expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
      }
      console.log(
        "[randomDate] 5 samples (2020-2023):",
        samples.slice(0, 5).join(", "),
      );
    });
  });

  test.describe("randomDateString", () => {
    test("trả về chuỗi định dạng ISO YYYY-MM-DD", () => {
      const dateStr = randomDateString(undefined, undefined, "ISO");
      console.log("[randomDateString] ISO:", dateStr);
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("trả về chuỗi định dạng locale", () => {
      const dateStr = randomDateString(undefined, undefined, "locale");
      console.log("[randomDateString] locale:", dateStr);
      expect(typeof dateStr).toBe("string");
      expect(dateStr.length).toBeGreaterThan(0);
    });
  });

  test.describe("randomPickFrom", () => {
    test("trả về phần tử thuộc mảng đầu vào", () => {
      const arr = [1, 2, 3, 4, 5];
      for (let i = 0; i < 20; i++) {
        expect(arr).toContain(randomArrayElement(arr));
      }
      console.log(
        "[randomArrayElement] sample from [1,2,3,4,5]:",
        randomArrayElement(arr),
      );
    });

    test("hoạt động với mảng string", () => {
      const arr = ["a", "b", "c"];
      const picked = randomArrayElement(arr);
      console.log("[randomArrayElement] sample from ['a','b','c']:", picked);
      expect(arr).toContain(picked);
    });
  });

  test.describe("randomSample", () => {
    test("trả về đúng số lượng phần tử yêu cầu", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sample = randomSample(arr, 4);
      console.log("[randomSample] 4 from [1..10]:", sample);
      expect(sample.length).toBe(4);
    });

    test("không có phần tử trùng lặp", () => {
      const arr = [1, 2, 3, 4, 5];
      const sample = randomSample(arr, 5);
      console.log("[randomSample] all 5, unique check:", sample);
      const unique = new Set(sample);
      expect(unique.size).toBe(sample.length);
    });

    test("tất cả phần tử thuộc mảng gốc", () => {
      const arr = ["x", "y", "z"];
      const sample = randomSample(arr, 2);
      console.log("[randomSample] 2 from ['x','y','z']:", sample);
      sample.forEach((item) => {
        expect(arr).toContain(item);
      });
    });

    test("count lớn hơn mảng thì trả về toàn bộ mảng", () => {
      const arr = [1, 2, 3];
      const sample = randomSample(arr, 100);
      console.log("[randomSample] count>length, result:", sample);
      expect(sample.length).toBe(3);
    });
  });

  test.describe("randomFullName", () => {
    test("trả về chuỗi có ít nhất 2 từ", () => {
      const names: string[] = [];
      for (let i = 0; i < 10; i++) {
        const name = randomFullName();
        names.push(name);
        expect(name.trim().split(" ").length).toBeGreaterThanOrEqual(2);
      }
      console.log("[randomFullName] 10 samples:", names.join(" | "));
    });
  });

  test.describe("randomAddress", () => {
    test("trả về địa chỉ chứa TP.HCM", () => {
      const address = randomAddress();
      console.log("[randomAddress]:", address);
      expect(address).toContain("TP.HCM");
    });

    test("trả về chuỗi không rỗng", () => {
      const address = randomAddress();
      console.log("[randomAddress] non-empty check:", address);
      expect(address.length).toBeGreaterThan(0);
    });
  });

  test.describe("randomUUID", () => {
    test("trả về UUID đúng định dạng v4", () => {
      const uuid = randomUUID();
      console.log("[randomUUID]:", uuid);
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    test("mỗi lần gọi trả về UUID khác nhau", () => {
      const uuids = Array.from({ length: 20 }, () => randomUUID());
      console.log("[randomUUID] 5 samples:", uuids.slice(0, 5).join(", "));
      expect(new Set(uuids).size).toBe(20);
    });
  });
});
