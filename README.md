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
- 利用者の表示名登録
- 本人による予約変更・削除
- 管理者による全予約と機器状態の管理

## ローカル開発

Node.js 22.13以上を使用します。

```bash
npm install
npm run dev
```

ローカル環境では、管理者 `y.kudo@ist.hokudai.ac.jp` として動作します。ローカルのD1データは `.wrangler/` 以下に作成され、Gitには含まれません。

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
npm run build
npx wrangler deploy
```

公開前に、Cloudflare AccessがProductionのWorker URLを保護していることを確認してください。Accessを外した状態で公開しないでください。

## データとプライバシー

- 氏名とメールアドレスは現在D1内で紐づけて保存されます。
- 他の一般利用者へメールアドレスは返しません。
- 予約の表示名、用途、日時、備考は許可された利用者間で共有されます。
- 用途・備考には、被験者情報、個人情報、機密性の高い研究情報を入力しないでください。

メールアドレスを匿名化IDへ移行するまでは、現行仕様であることを運用者が把握してください。

## 管理者

現在の管理者は `app/api/auth.ts` の `ADMIN_EMAILS` で指定しています。管理者交代時には、後任者のメールへ変更して再公開します。

将来的には、コード変更なしで管理者を交代できる仕組みに移行する予定です。

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
