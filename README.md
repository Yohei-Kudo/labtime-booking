# LabTime

研究室の実験装置・GPUサーバーの利用時間を管理する内部向け予約ツールです。

## 現在の構成

- Webアプリ: Vinext / React / TypeScript
- 実行環境: Cloudflare Workers
- データベース: Cloudflare D1
- 認証・アクセス制限: Cloudflare Access
- 公開URL: <https://labtime-booking.y-kudo1227.workers.dev>

対象機器は、750MHz EPR装置、M3、X-band、1.5T-MRI、GPU-01です。

## 主な機能

- 日表示・週表示の予約カレンダー
- 1時間単位および複数日にまたがる予約
- 同一機器・同一時間帯の重複防止
- GPU-01のGPU利用／CPUのみ利用の区分
- `EPR-xx`／`MRI-xx`形式の表示名登録（本名不要）
- 本人による予約変更・削除
- 管理者による全予約と機器状態の管理

## ローカル開発

Node.js 22.13以上を使用します。

```bash
npm install
npm run dev
```

ローカル環境では、開発用の仮想管理者として動作します。ローカルのD1データは `.wrangler/` 以下に作成され、Gitには含まれません。

## 確認コマンド

```bash
npm run lint
npm run build
npm test
```

## Cloudflareへの公開

Cloudflareへのログイン後、次のコマンドで公開します。

```bash
npx wrangler login
npx wrangler secret put IDENTITY_PEPPER
npx wrangler secret put ADMIN_EMAILS
npm run build
npx wrangler d1 migrations apply labtime-db --remote
npx wrangler deploy
```

`IDENTITY_PEPPER` には32バイト以上のランダム値を設定します。一度運用を始めた後は、値を失うと既存予約と利用者を紐づけられなくなるため、Cloudflareの管理権限と合わせて安全に引き継いでください。`ADMIN_EMAILS` は管理者メールをカンマ区切りで指定します。どちらもGitには保存しません。

`0002_familiar_leech.sql` は旧形式のプロフィールと予約を削除するプライバシー移行です。本番適用前に件数を確認し、必要な予約がある場合は移行作業を別途行ってください。

公開前に、Cloudflare AccessがProductionのWorker URLを保護していることを確認してください。Accessを外した状態で公開しないでください。

## データとプライバシー

- メールアドレスはCloudflare Accessでの認可と、秘密値を使った匿名ID生成にだけ利用します。
- D1にはメールアドレスを保存せず、元のメールアドレスへ戻せないHMAC-SHA-256の匿名IDを保存します。
- ブラウザへ返す予約データにもメールアドレスを含めません。
- 予約の表示名、用途、日時、備考は許可された利用者間で共有されます。
- 用途・備考には、被験者情報、個人情報、機密性の高い研究情報を入力しないでください。

## 管理者

管理者はCloudflare WorkerのSecret `ADMIN_EMAILS` で指定します。管理者交代時はCloudflare上の値を変更して再公開し、コードへメールアドレスを記録しません。

## 引き継ぎ時の確認事項

1. GitHubリポジトリの所有権または管理権限を後任者へ渡す
2. Cloudflareアカウントへ後任者をメンバーとして追加する
3. Workers、D1、Accessポリシーを後任者が確認できるようにする
4. 後任者の端末でビルドとテストを実行する
5. 後任者自身でテスト公開または本番公開を実行する
6. 管理者メールとAccess許可リストを更新する
7. 旧管理者の不要な権限を削除する

アカウントのパスワードやAPIトークンは共有せず、GitHubとCloudflareのメンバー招待機能を使用してください。

## セキュリティ上の注意

- GitHubリポジトリはPrivateを維持する
- `.env*`、APIトークン、秘密鍵をコミットしない
- Cloudflare管理者はMFAを有効にする
- 依存パッケージを定期的に更新する
- 変更後は `npm run lint` と `npm run build` を通す
