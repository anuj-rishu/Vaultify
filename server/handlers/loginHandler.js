const axios = require("axios");
const { getUserWithPhoto } = require("../helpers/userHelper");
const User = require("../models/User");

async function login(username, password) {
  const user = username.replace("@srmist.edu.in", "");
  const url = `https://academia.srmist.edu.in/accounts/p/40-10002227248/signin/v2/lookup/${user}@srmist.edu.in`;

  try {
    const lookupResponse = await axios({
      method: "POST",
      url: url,
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "sec-ch-ua":
          '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-zcsrf-token":
          "iamcsrcoo=3c59613cb190a67effa5b17eaba832ef1eddaabeb7610c8c6a518b753bc73848b483b007a63f24d94d67d14dda0eca9f0c69e027c0ebd1bb395e51b2c6291d63",
        cookie:
          "npfwg=1; npf_r=; npf_l=www.srmist.edu.in; npf_u=https://www.srmist.edu.in/faculty/dr-g-y-rajaa-vikhram/; zalb_74c3a1eecc=44130d4069ebce16724b1740d9128cae; ZCNEWUIPUBLICPORTAL=true; zalb_f0e8db9d3d=93b1234ae1d3e88e54aa74d5fbaba677; stk=efbb3889860a8a5d4a9ad34903359b4e; zccpn=3c59613cb190a67effa5b17eaba832ef1eddaabeb7610c8c6a518b753bc73848b483b007a63f24d94d67d14dda0eca9f0c69e027c0ebd1bb395e51b2c6291d63; zalb_3309580ed5=2f3ce51134775cd955d0a3f00a177578; CT_CSRF_TOKEN=9d0ab1e6-9f71-40fd-826e-7229d199b64d; iamcsr=3c59613cb190a67effa5b17eaba832ef1eddaabeb7610c8c6a518b753bc73848b483b007a63f24d94d67d14dda0eca9f0c69e027c0ebd1bb395e51b2c6291d63; _zcsr_tmp=3c59613cb190a67effa5b17eaba832ef1eddaabeb7610c8c6a518b753bc73848b483b007a63f24d94d67d14dda0eca9f0c69e027c0ebd1bb395e51b2c6291d63; npf_fx=1; _ga_QNCRQG0GFE=GS1.1.1737645192.5.0.1737645194.58.0.0; TS014f04d9=0190f757c98d895868ec35d391f7090a39080dd8e7be840ed996d7e2827e600c5b646207bb76666e56e22bfaf8d2c06ec3c913fe80; cli_rgn=IN; JSESSIONID=E78E4C7013F0D931BD251EBA136D57AE; _ga=GA1.3.1900970259.1737341486; _gid=GA1.3.1348593805.1737687406; _gat=1; _ga_HQWPLLNMKY=GS1.3.1737687405.1.0.1737687405.0.0.0",
        Referer:
          "https://academia.srmist.edu.in/accounts/p/10002227248/signin?hide_fp=true&servicename=ZohoCreator&service_language=en&css_url=/49910842/academia-academic-services/downloadPortalCustomCss/login&dcc=true&serviceurl=https%3A%2F%2Facademia.srmist.edu.in%2Fportal%2Facademia-academic-services%2FredirectFromLogin",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      data: "mode=primary&cli_time=1737687406853&servicename=ZohoCreator&service_language=en&serviceurl=https%3A%2F%2Facademia.srmist.edu.in%2Fportal%2Facademia-academic-services%2FredirectFromLogin",
    });

    const data = lookupResponse.data;

    if (data.errors && data.errors.length > 0) {
      const lookupMsg = data.errors[0].message;
      const statusCode = data.status_code;

      if (statusCode === 400) {
        return {
          cookies: "",
          status: statusCode,
          message: data.message?.includes("HIP")
            ? ">_ Captcha required, We don't support yet"
            : data.message,
          errors: [lookupMsg],
        };
      }
    }

    const exists = data.message && data.message.includes("User exists");

    if (!exists) {
      return {
        authenticated: false,
        session: null,
        lookup: null,
        cookies: "",
        status: data.status_code,
        message: data.message?.includes("HIP")
          ? data.localized_message
          : data.message,
        errors: null,
      };
    }

    const lookup = data.lookup;
    if (!lookup) {
      throw new Error("Invalid lookup data");
    }

    const session = await getSession(password, lookup);

    const sessionBody = {
      success: true,
      code: session.passwordauth?.code,
      message: session.message,
    };

    if (
      session.message.toLowerCase().includes("invalid") ||
      session.cookies.includes("undefined")
    ) {
      sessionBody.success = false;
      return {
        authenticated: false,
        session: sessionBody,
        lookup: {
          identifier: lookup.identifier,
          digest: lookup.digest,
        },
        cookies: session.cookies,
        status: data.status_code,
        message: session.message,
        errors: null,
      };
    }

    // After successful login, get user data and store in MongoDB
    try {
      const userData = await getUserWithPhoto(session.cookies);
      
      // Update or create user in MongoDB with token
      await User.findOneAndUpdate(
        { regNumber: userData.regNumber },
        {
          ...userData,
          token: session.cookies,
          tokenCreatedAt: new Date(),
          lastLogin: new Date()
        },
        { upsert: true, new: true }
      );
      
      console.log(`User ${userData.name} (${userData.regNumber}) data and token saved to MongoDB`);
    } catch (dbError) {
      console.error("Error saving user to database:", dbError);
      // Continue with login process even if DB storage fails
    }

    return {
      authenticated: true,
      session: sessionBody,
      lookup: lookup,
      cookies: session.cookies,
      status: data.status_code,
      message: data.message,
      errors: null,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

async function getSession(password, lookup) {
  const { identifier, digest } = lookup;
  const body = JSON.stringify({ passwordauth: { password } });

  try {
    const response = await axios({
      method: "POST",
      url: `https://academia.srmist.edu.in/accounts/p/40-10002227248/signin/v2/primary/${identifier}/password?digest=${digest}&cli_time=1713533853845&servicename=ZohoCreator&service_language=en&serviceurl=https://academia.srmist.edu.in/portal/academia-academic-services/redirectFromLogin`,
      headers: {
        accept: "*/*",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "x-zcsrf-token": "iamcsrcoo=884b99c7-829b-4ddf-8344-ce971784bbe8",
        cookie:
          "f0e8db9d3d=7ad3232c36fdd9cc324fb86c2c0a58ad; bdb5e23bb2=3fe9f31dcc0a470fe8ed75c308e52278; zccpn=221349cd-fad7-4b4b-8c16-9146078c40d5; ZCNEWUIPUBLICPORTAL=true; cli_rgn=IN; iamcsr=884b99c7-829b-4ddf-8344-ce971784bbe8; _zcsr_tmp=884b99c7-829b-4ddf-8344-ce971784bbe8; 74c3a1eecc=d06cba4b90fbc9287c4162d01e13c516;",
      },
      data: body,
    });

    const data = response.data;

    let cookiesHeader = "";
    if (response.headers["set-cookie"]) {
      if (Array.isArray(response.headers["set-cookie"])) {
        cookiesHeader = response.headers["set-cookie"].join("; ");
      } else {
        cookiesHeader = response.headers["set-cookie"];
      }
    }

    data.cookies = cookiesHeader;
    return data;
  } catch (error) {
    console.error("Session error:", error);
    throw error;
  }
}

async function logout(token) {
  try {
    // Also update MongoDB to mark the user as logged out
    try {
      await User.findOneAndUpdate(
        { token: token },
        { $unset: { token: 1, tokenCreatedAt: 1 } }
      );
    } catch (dbError) {
      console.error("Error updating user logout status in database:", dbError);
    }
    
    const response = await axios({
      method: "POST",
      url: "https://academia.srmist.edu.in/accounts/logout",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: token,
      },
    });

    return {
      success: true,
      message: "Successfully logged out",
      status: response.status,
    };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      message: error.message || "Failed to logout",
      status: error.response?.status || 500,
    };
  }
}

module.exports = {
  login,
  logout,
  getSession,
};