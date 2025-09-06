import { NextRequest, NextResponse } from "next/server";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const apiGatewayUrl = process.env.DELETE_ACCOUNT_API_GATEWAY_URL;
    const region = process.env.AWS_REGION || "ap-northeast-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!apiGatewayUrl || !accessKeyId || !secretAccessKey) {
      console.error("Missing required environment variables");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 }
      );
    }

    // リクエストボディ
    const requestBody = JSON.stringify({ email });

    // IAM署名の作成
    const signer = new SignatureV4({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
      service: "execute-api",
      sha256: Sha256,
    });

    const url = new URL(apiGatewayUrl);
    
    // 署名付きリクエストの作成
    const signedRequest = await signer.sign({
      method: "POST",
      hostname: url.hostname,
      path: url.pathname,
      protocol: url.protocol,
      headers: {
        "Content-Type": "application/json",
        "Host": url.hostname,
      },
      body: requestBody,
    });

    // API Gatewayにリクエスト送信
    const response = await fetch(apiGatewayUrl, {
      method: "POST",
      headers: signedRequest.headers,
      body: requestBody,
    });

    if (!response.ok) {
      console.error(`API Gateway request failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to record account deletion" },
        { status: 500 }
      );
    }

    const responseData = await response.json();
    
    return NextResponse.json(
      { message: "Account deletion recorded successfully", data: responseData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error recording account deletion:", error);
    return NextResponse.json(
      { error: "Failed to record account deletion" },
      { status: 500 }
    );
  }
}