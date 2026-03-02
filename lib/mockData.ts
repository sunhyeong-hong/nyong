import { Delivery, Nyong, Upload, NyongFeatures } from '../types';

const TEST_OWNER_ID = '00000000-0000-0000-0000-000000000000';
const ADMIN_OWNER_ID = '84c6b735-5f1d-45d5-9721-93655fe4187f';
const MAEONGI_OWNER_ID = '006b1fd9-cef0-4b02-9e86-b9f65d144ce0';
const STORAGE_BASE = 'https://rhuzdhrqmwrsbnnwttsa.supabase.co/storage/v1/object/public/uploads';

const emptyFeatures: NyongFeatures = {
  fur_color: '',
  fur_pattern: '',
  eye_color: '',
  ear_shape: '',
  distinctive_marks: '',
  body_type: '',
};

// 실제 DB 뇽 프로필 (monthly_hits 내림차순)
const JJAJANG: Nyong = {
  id: 14,
  owner_id: ADMIN_OWNER_ID,
  name: '짜장',
  birthday: '2022-04-22',
  gender: 'male',
  personality: '말썽꾸러기/사나움/잘때만착해짐',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594481859_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 12847,
  monthly_hits: 12847,
  upload_count: 9,
  created_at: '2026-02-20T13:34:42Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const MAEONGI: Nyong = {
  id: 17,
  owner_id: MAEONGI_OWNER_ID,
  name: '매옹이',
  birthday: '2016-01-06',
  gender: 'female',
  personality: '산책냥이 개냥이',
  front_photo_url: `${STORAGE_BASE}/${MAEONGI_OWNER_ID}/1771764302350_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 9523,
  monthly_hits: 9523,
  upload_count: 4,
  created_at: '2026-02-22T12:45:09Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const AKU: Nyong = {
  id: 13,
  owner_id: ADMIN_OWNER_ID,
  name: '아쿠',
  birthday: '2023-01-20',
  gender: 'unknown',
  personality: '소심냥이지만 호기심 만땅',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594394365_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 7456,
  monthly_hits: 7456,
  upload_count: 7,
  created_at: '2026-02-20T13:33:15Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const DUKJA: Nyong = {
  id: 15,
  owner_id: ADMIN_OWNER_ID,
  name: '덕자',
  birthday: '2024-09-01',
  gender: 'male',
  personality: '호기심 많은 겁쟁이',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771741218133_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 5231,
  monthly_hits: 5231,
  upload_count: 4,
  created_at: '2026-02-22T06:20:18Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const YEONDU: Nyong = {
  id: 9,
  owner_id: ADMIN_OWNER_ID,
  name: '연두',
  birthday: '2024-06-05',
  gender: 'male',
  personality: '사파이어 눈동자를 가진 개냥',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771424265518_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 3892,
  monthly_hits: 3892,
  upload_count: 5,
  created_at: '2026-02-18T14:17:46Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const CHUNSIK: Nyong = {
  id: 16,
  owner_id: ADMIN_OWNER_ID,
  name: '춘식이',
  birthday: '2022-02-05',
  gender: 'male',
  personality: '코리안숏헤어 대표미남',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771741323737_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 2847,
  monthly_hits: 2847,
  upload_count: 7,
  created_at: '2026-02-22T06:22:04Z',
  updated_at: '2026-02-25T00:00:00Z',
};

const MUMU: Nyong = {
  id: 10,
  owner_id: ADMIN_OWNER_ID,
  name: '무무',
  birthday: '2023-07-06',
  gender: 'female',
  personality: '깨발랄',
  front_photo_url: `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771424483242_front.jpg`,
  photo_urls: [],
  features: emptyFeatures,
  total_hits: 1876,
  monthly_hits: 1876,
  upload_count: 4,
  created_at: '2026-02-18T14:21:23Z',
  updated_at: '2026-02-25T00:00:00Z',
};

// 실제 업로드 이미지로 Delivery 생성
function makeUpload(id: number, nyong: Nyong, imageUrl: string, tag: string, hits: number, uploadedAt: string): Upload {
  return {
    id,
    user_id: nyong.owner_id,
    image_url: imageUrl,
    hits,
    uploaded_at: uploadedAt,
    tag,
    nyong_id: nyong.id,
    nyong,
  };
}

function makeDelivery(
  id: number,
  upload: Upload,
  hits: number,
  deliveredAt: string,
  status: 'delivered' | 'received' = 'received',
  receivedAt: string | null = deliveredAt,
): Delivery {
  return {
    id,
    upload_id: upload.id,
    sender_id: upload.user_id,
    receiver_id: TEST_OWNER_ID,
    status,
    delivered_at: deliveredAt,
    received_at: receivedAt,
    hits,
    created_at: deliveredAt,
    upload,
  };
}

// 갤러리용 업로드 12개 (실제 이미지 URL)
const galleryUploads = [
  makeUpload(75, MAEONGI, `${STORAGE_BASE}/${MAEONGI_OWNER_ID}/1771895443222.jpg`, '코롬하다냥', 347, '2026-02-24T15:00:00Z'),
  makeUpload(63, CHUNSIK, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771741627633_seed_1.jpg`, '애기춘식이다냥', 891, '2026-02-24T00:00:00Z'),
  makeUpload(70, DUKJA, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771742008473_seed_1.jpg`, '캣타워준비중', 723, '2026-02-24T00:00:00Z'),
  makeUpload(49, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_3.jpg`, '꽃보다짜장', 1246, '2026-02-23T00:00:00Z'),
  makeUpload(58, AKU, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771595267810_seed_3.jpg`, '귀여운아쿠', 456, '2026-02-23T00:00:00Z'),
  makeUpload(74, MAEONGI, `${STORAGE_BASE}/${MAEONGI_OWNER_ID}/1771859753923.jpg`, '매옹이는산책중', 982, '2026-02-23T00:00:00Z'),
  makeUpload(59, AKU, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771595267810_seed_4.jpg`, '그루밍아쿠', 634, '2026-02-22T00:00:00Z'),
  makeUpload(50, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_4.jpg`, '냥팔자상팔자', 512, '2026-02-22T00:00:00Z'),
  makeUpload(41, YEONDU, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771501765006_seed_0.jpg`, '내눈을바라봐', 789, '2026-02-21T00:00:00Z'),
  makeUpload(37, MUMU, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771500904630_seed_1.jpg`, '오늘도사색냥', 421, '2026-02-21T00:00:00Z'),
  makeUpload(65, CHUNSIK, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771741627633_seed_3.jpg`, '똘망똘망', 567, '2026-02-20T00:00:00Z'),
  makeUpload(76, MAEONGI, `${STORAGE_BASE}/${MAEONGI_OWNER_ID}/1771945490319.jpg`, '미묘매옹', 0, '2026-02-25T00:00:00Z'),
];

// 갤러리 Delivery 12개
export const MOCK_DELIVERIES: Delivery[] = [
  makeDelivery(7001, galleryUploads[0], 347, '2026-02-25T07:42:36Z'),
  makeDelivery(7002, galleryUploads[1], 891, '2026-02-25T07:23:01Z'),
  makeDelivery(7003, galleryUploads[2], 723, '2026-02-25T07:22:42Z'),
  makeDelivery(7004, galleryUploads[3], 1246, '2026-02-25T07:11:17Z'),
  makeDelivery(7005, galleryUploads[4], 456, '2026-02-25T07:10:49Z'),
  makeDelivery(7006, galleryUploads[5], 982, '2026-02-25T07:00:02Z'),
  makeDelivery(7007, galleryUploads[6], 634, '2026-02-24T12:00:00Z'),
  makeDelivery(7008, galleryUploads[7], 512, '2026-02-24T06:00:00Z'),
  makeDelivery(7009, galleryUploads[8], 789, '2026-02-23T12:00:00Z'),
  makeDelivery(7010, galleryUploads[9], 421, '2026-02-23T06:00:00Z'),
  // locked: 2시간 전 delivered, 안 봄
  (() => {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    return makeDelivery(7011, galleryUploads[10], 567, twoHoursAgo.toISOString(), 'delivered', null);
  })(),
  // NEW (unseen)
  makeDelivery(7012, galleryUploads[11], 0, new Date().toISOString(), 'delivered', null),
];

// 명예의 전당용 Top 5
export const MOCK_TOP_NYONGS: Nyong[] = [
  JJAJANG,   // 1,615
  MAEONGI,   // 1,545
  AKU,       // 1,451
  DUKJA,     // 1,253
  YEONDU,    // 1,015
];

// 뇽 보내기 - 내 뇽 목록 (짜장, 아쿠)
export const MOCK_MY_NYONGS: Nyong[] = [JJAJANG, AKU];

// 뇽 보내기 - 짜장의 업로드 히스토리
export const MOCK_UPLOADS: Upload[] = [
  makeUpload(49, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_3.jpg`, '꽃보다짜장', 1246, '2026-02-23T00:00:00Z'),
  makeUpload(50, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_4.jpg`, '냥팔자상팔자', 512, '2026-02-22T00:00:00Z'),
  makeUpload(51, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_5.jpg`, '덤벼라냥', 873, '2026-02-21T00:00:00Z'),
  makeUpload(54, JJAJANG, `${STORAGE_BASE}/${ADMIN_OWNER_ID}/1771594700684_seed_8.jpg`, '돼지냥', 0, '2026-02-25T00:00:00Z'),
];
