import { test, expect, APIResponse } from "@playwright/test";
import {
  randomDateString,
  randomImageBase64,
  randomInt,
  randomSentence,
  randomString,
  randomURL,
} from "../../src/helpers/function-helper";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";

import { generateJWT } from "../../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../../src/helpers/user-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/campaign`;

// const USER_UID = "llt5mqx11xxl291lta91aqaaaalxxq67";
// const SECRET_KEY = "8qbcc2zzzzbz0ezs20e9jjz90cbxls22";

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
  Authorization: token,
});

const logResponse = async (res: APIResponse) => {
  let responseBody: unknown = null;
  try {
    const rawBody = await res.text();
    responseBody =
      rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    console.log(JSON.stringify(responseBody, null, 2));
  } catch (error) {
    console.error("Failed to parse response body as JSON:", error);
    responseBody = await res.text(); // Fallback to raw text if JSON parsing fails
  }
  return responseBody;
};

const campaignTypes = ["CPC", "CPA", "CPS", "CPL"];

const sDate = randomDateString(
  new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  new Date(),
  "ISO",
);

const eDate = randomDateString(
  new Date(),
  new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
  "ISO",
);

const basicPayload = () => ({
  insertCampaignDetails: {
    merchantId: randomInt(1760, 2300),
    campaignStatus: "RUNNING",
    category1: 1,
    category2: 2,
    category3: 3,
    campaignName: `Campaign Test - ${randomString(5)} ${randomInt(1000, 9999)}`,
    campaignType: campaignTypes[randomInt(0, campaignTypes.length - 1)],
    url: randomURL(),
    deviceTypes: "PC,Android,iPhone,Android Tablet,iPad",
    getParameterFlag: "SOCKET",
    pointbackPermission: 1,
    selfConversionFlag: 1,
    hiddenFlag: 0,
    offerCode: "OFFER123",
    campaignStartDate: sDate,
    campaignEndDate: eDate,
    // startDate: sDate,
    // endDate: eDate,
    currency: "VND",
    hideClickReferrer: 0,
    adPlatformId: 0,
    createdBy: "staff_user",
    integratedCampaignId: null,
    integratedCountryCode: null,
    isRewardsByCategoriesVisible: true,
    customerCountries: "VNM",
    campaignApplication: "WEB_AND_MOBILE_APP", // WEB_ONLY(1), MOBILE_APP_ONLY(2), WEB_AND_MOBILE_APP(3);
    imageUrl:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    isAlternativeLinkUsed: 0,
    ogDescription: "OG description",
    ogImage: `${randomURL()}.png`,
  },
  categoryIds: [1, 2, 3],
  insertCampaignSettingDetails: {
    cvOnlyOnceFlag: 1,
    cookieExpirationDateView: 30,
    verifyCutFlag: 0,
    verifyCutTarget: 0,
    verifyCutCondition: 0,
  },
  campaignLogoImageBase64: randomImageBase64(),
});

const validPayload = () => ({
  insertCampaignDetails: {
    merchantId: 15687,
    campaignStatus: "RUNNING",
    category1: 1,
    category2: 2,
    category3: 3,
    campaignName: `Campaign Test - ${randomString(5)} ${randomInt(1000, 9999)}`,
    campaignType: campaignTypes[randomInt(0, campaignTypes.length - 1)],
    url: randomURL(),
    description: randomSentence(50),
    descriptionEnglish: randomSentence(15),
    affConditionSpecial: "TODO_AFF_CONDITION_SPECIAL",
    rejectConditions: "Local reject conditions",
    resultApprovalSpecial: "Local result approval",
    prForPartner: "TODO_PR_FOR_PARTNER",
    deviceTypes: "PC,Android,iPhone,Android Tablet,iPad",
    getParameterFlag: "COOKIE",
    pointbackPermission: 1,
    selfConversionFlag: 1,
    hiddenFlag: 0,
    offerCode: "OFFER123",
    campaignStartDate: sDate,
    campaignEndDate: eDate,
    // startDate: sDate,
    // endDate: eDate,
    currency: "VND",
    hideClickReferrer: 0,
    adPlatformId: 0,
    createdBy: "staff_user",
    integratedCampaignId: null,
    integratedCountryCode: null,
    isRewardsByCategoriesVisible: true,
    customerCountries: "VNM",
    affConditionSpecialEnglish: "EN required actions",
    resultApprovalSpecialEnglish: "EN result approval",
    validationTerm: "Local validation",
    validationTermEnglish: "EN validation",
    trafficRestrictions: "Restrictions text",
    campaignApplication: "WEB_AND_MOBILE_APP", // WEB_ONLY(1), MOBILE_APP_ONLY(2), WEB_AND_MOBILE_APP(3);
    imageUrl:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    isAlternativeLinkUsed: 0,
    ogDescription: "OG description",
    ogImage: `${randomURL()}.png`,
  },
  categoryIds: [1, 2, 3],
  insertCampaignSettingDetails: {
    cvOnlyOnceFlag: 1,
    cookieExpirationDateView: 30,
    verifyCutFlag: 0,
    verifyCutTarget: 0,
    verifyCutCondition: 0,
  },
  campaignLogoImageBase64: randomImageBase64(),
});

test.describe("Create New Campaign API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Create New Campaign API
   * 
    ID	Case Summary	Expected Result	Actual Result
    TC01	Verify invalid / empty request body	Return 400 with message: "Body is missing"	"Body is missing"
    TC01.1	Verify insertCampaignDetails is missing in request body	Return 400 with message: "insertCampaignDetails is missing"	"insertCampaignDetails is missing"
    TC02	Verify merchantId is null	Return 400 with required field validation error	Matches expected result
    TC02.1	Verify merchantId does not exist	Return 400 with message: "merchantId does not exist"	Matches expected result
    TC02.2	Verify merchantId is negative	Return 400 with message: "merchantId must be greater than 0"	Matches expected result
    TC03	Verify insertCampaignDetails is null	Return 400 with message: "insertCampaignDetails is missing"	Matches expected result
    TC04	Verify campaignType is null	Return 400 with required field validation error	Matches expected result
    TC05	Verify campaignStatus is null	Return 400 with required field validation error	Matches expected result
    TC06	Verify campaignApplication is null	Return 400 with required field validation error	Matches expected result
    TC07	Verify campaignName is empty	Return 400 with required field validation error	Matches expected result
    TC08	Verify url is empty	Return 400 with required field validation error	Matches expected result
    TC09	Verify deviceTypes is empty	Return 400 with required field validation error	Matches expected result
    TC10	Verify getParameterFlag is null	Return 400 with required field validation error	Matches expected result
    TC11	Verify customerCountries is empty	Return 400 with required field validation error	Matches expected result
    TC12	Verify successful campaign creation (Basic)	Return 200 with inserted count according to spec	New campaignId returned
    TC13	Verify successful creation with all optional fields	Campaign created successfully with description, category, currency, dates, etc.	N/A
    TC14	Verify invalid date range	Return 400 when startDate > endDate	N/A
    TC15	Verify invalid URL format	Return 400 for invalid URL format	N/A
    TC16	Verify invalid flag values	Return validation error when flag values are outside allowed range (0/1)	N/A
    TC17	Verify character limit validation	Return validation error when campaign name or description exceeds max length	N/A
    TC18	Verify logical constraint for auto action duration	Return validation error for negative or invalid auto action duration	N/A
   */

  test("TC01 - Verify invalid / empty request body", async ({ request }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: null,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Body is missing/i);
  });

  test("TC01.1 - Verify insertCampaignDetails is missing in request body", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/insertCampaignDetails is missing/i);
  });

  test("TC02 - Verify merchantId is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC02.1 - Verify merchantId does not exist", async ({ request }) => {
    const merchantId = 6555545; // Giả sử ID này không tồn tại trong hệ thống
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: merchantId,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      new RegExp(`Merchant \\[${merchantId}\\] does not exist.`, "i"),
    );
  });

  test("TC02.2 - Verify merchantId = 0 or is negative", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: 0,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC03 - Verify insertCampaignDetails is null", async ({ request }) => {
    const payload = { ...validPayload(), insertCampaignDetails: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/insertCampaignDetails is missing/i);
  });

  test("TC04 - Verify campaignType is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignType: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignType/i);
  });

  test("TC05 - Verify campaignStatus is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStatus: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStatus/i);
  });

  test("TC06 - Verify campaignApplication is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignApplication: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignApplication/i);
  });

  test("TC07 - Verify campaignName is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignName: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignName/i);
  });

  test("TC08 - Verify url is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        url: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/url/i);
  });

  test("TC09 - Verify deviceTypes is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        deviceTypes: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/deviceTypes/i);
  });

  test("TC10 - Verify getParameterFlag is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        getParameterFlag: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/getParameterFlag/i);
  });

  test("TC11 - Verify customerCountries is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        customerCountries: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });

  // ! Verify status code and response body
  test.skip("TC12 - Verify successful campaign creation (Basic)", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  // ! Verify status code and response body
  test("TC13 - Verify successful creation with all optional fields", async ({
    request,
  }) => {
    const payload = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test("TC14 - Verify invalid date range (startDate > endDate)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStartDate: "2025-05-01",
        campaignEndDate: "2025-04-01",
        startDate: "2025-05-01",
        endDate: "2025-04-01",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /campaignStartDate must be less than or equal to campaignEndDate./i,
    );
  });

  test("TC15 - Verify invalid URL format", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        url: "invalid-url",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/url must be a valid URL/i);
  });

  test("TC16 - Verify invalid flag values (outside allowed range 0/1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        hiddenFlag: 99,
        selfConversionFlag: -1,
        pointbackPermission: 5,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /pointbackPermission must be 0 or 1./i,
    );
  });

  test("TC17 - Verify character limit validation (campaignName exceeds max length)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignName: "A".repeat(513),
        description: "B".repeat(5000),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /campaignName must be less than 512 characters/i,
    );
  });

  test("TC18 - Verify logical constraint for auto action duration (negative value)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        cookieExpirationDateView: -1,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /cookieExpirationDateView must be greater than or equal to 0/i,
    );
  });
});
