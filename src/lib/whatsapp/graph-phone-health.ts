type GraphErr = { error?: { message?: string } };

export type PhoneNumberHealth = {
  ok: true;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
};

/**
 * Meta Graph: phone_number_id ile hat bilgisini okur (token doğrulaması).
 */
export async function fetchWhatsAppPhoneNumberHealth(params: {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}): Promise<PhoneNumberHealth> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  async function fetchFields(fields: string) {
    const url = `https://graph.facebook.com/${v}/${params.phoneNumberId}?fields=${fields}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    const data = (await res.json().catch(() => ({}))) as GraphErr &
      Record<string, unknown>;
    return { res, data };
  }

  let { res, data } = await fetchFields(
    "display_phone_number,verified_name,quality_rating",
  );
  if (!res.ok) {
    ({ res, data } = await fetchFields("display_phone_number,verified_name"));
  }
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Graph HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    ok: true,
    displayPhoneNumber:
      typeof data.display_phone_number === "string"
        ? data.display_phone_number
        : undefined,
    verifiedName:
      typeof data.verified_name === "string" ? data.verified_name : undefined,
    qualityRating:
      typeof data.quality_rating === "string" ? data.quality_rating : undefined,
  };
}
