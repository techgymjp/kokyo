# iOS 版をビルドして App Store に出す手順（Mac での作業）

皇居ランナーの iOS 版は、Android 版と同じ Capacitor で作っています（`ios/` フォルダ）。
コードの準備はできているので、Mac では「ビルドして App Store Connect にアップロードする」作業だけを行います。
構成は techgymjp/jet-fighter（JET STRIKE）の `docs/IOS_BUILD.md` と同じです。

- Bundle ID：`jp.techgym.kokyo`（Android のパッケージ名と同じ）
- App Store のアプリ名：皇居ランナー：ロードバイクで皇居一周（英語は Kokyo Runner: Palace Bike Ride。ホーム画面の名前は「皇居ランナー」、英語の端末では「Kokyo Runner」）
- SKU：`kokyorunner`
- チーム：Team ID `GNM3VTX9YG`（Xcode の設定に入れてあります）。Apple Developer には**個人で登録**しています（App Store の販売元は個人名になります）
- 対応端末：iPhone（横画面固定）。iPad では iPhone 用の画面で動きます
- 広告：AdMob（iOS 用のアプリと広告ユニット）。起動時に「トラッキングの許可」の確認画面が出ます

---

## 0. ブラウザでの準備（最初の1回だけ）

1. **Apple Developer**（developer.apple.com）→「Certificates, Identifiers & Profiles」→「Identifiers」→「＋」→「App IDs」→「App」
   - Description：`Kokyo Runner`
   - Bundle ID：「Explicit」で `jp.techgym.kokyo`
   - Capabilities：何もチェックしない
2. **App Store Connect**（appstoreconnect.apple.com）→「マイ App」→「＋」→「新規 App」
   - プラットフォーム：iOS ／ 名前：`皇居ランナー：ロードバイクで皇居一周` ／ プライマリ言語：日本語
   - バンドル ID：1 で登録した `jp.techgym.kokyo` ／ SKU：`kokyorunner` ／ ユーザアクセス：アクセス制限なし
3. **AdMob**
   - 「アプリを追加」→ **iOS** →「ストアに掲載されていない」で登録し、バナー・インタースティシャル・リワードの広告ユニットを作る
   - アプリ ID と広告ユニット ID 3 つを Claude Code に渡す（`ios/App/App/Info.plist` の `GADApplicationIdentifier` と `js/ads.js` の `UNITS.ios.production` に入れてもらう）
   - 「プライバシーとメッセージ」→「欧州の規制」のメッセージに iOS アプリも追加する
   - 登録済み：iOS のアプリ ID `ca-app-pub-6411535997477460~4878968647`、バナー `ca-app-pub-6411535997477460/2320078906`、インタースティシャル `ca-app-pub-6411535997477460/2308645628`

---

## 1. Mac の準備（最初の1回だけ）

1. **Xcode** を App Store からインストールする（数十 GB あるので時間がかかります）。インストール後に一度起動し、追加コンポーネントのインストールを済ませる
2. Xcode の「Settings…」→「Accounts」→「＋」で、Apple Developer に登録している Apple ID でサインインする（チームが個人名で表示されれば OK）
3. **Node.js**（LTS 版）を https://nodejs.org/ からインストールする
4. ターミナルでリポジトリを取得する
   ```bash
   cd ~/Desktop   # 置きたい場所（どこでもよい）
   git clone https://github.com/techgymjp/kokyo.git
   cd kokyo
   npm ci
   ```
   `git` がないと言われたら、表示に従って「コマンドライン・デベロッパツール」をインストールしてから、もう一度実行します。

2回目以降は、`cd kokyo` のあと `git pull` と `npm ci` で最新にします。

---

## 2. 自分の iPhone で動作確認する（テスト広告）

```bash
npm run ios:sync    # ゲームのファイルを iOS のプロジェクトにコピー（テスト広告）
npm run ios:open    # Xcode で開く
```

1. iPhone を USB ケーブルで Mac につなぎ、iPhone で「このコンピュータを信頼」を許可する
2. iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにする（再起動を求められます。項目がない場合は、Xcode で一度 iPhone を選ぶと表示されます）
3. Xcode の上部で、実行先に自分の iPhone を選ぶ
4. 左の「App」→「Signing & Capabilities」で、「Automatically manage signing」がオン、Team に自分（個人名）のチームが選ばれていることを確認する
5. ▶（Run）を押すと、iPhone にアプリが入って起動する

確認すること：

- 横画面で全画面表示になる。ダイナミックアイランド（ノッチ）やホームバーにボタンや文字が重ならない
- 起動するとトラッキングの確認画面が出る
- タイトル・遊び方・結果画面に**テストのバナー**が出て、プレイ中は消える。結果画面のボタン（シェア・タイトルへ）がバナーに隠れない
- 「スタート」や「もう一度」などで**テストの全画面広告**が出る
- ぶつかると「広告を見て、続きから走る」が出て、**テストのリワード広告**を最後まで見ると、ぶつかる少し前から続きを走れる（1 ゲーム 5 回まで）
- 左右・ブレーキ・ダッシュのボタンで操作できる。段差や石畳で振動する（iPhone では振動しないこともある）。BGM と効果音が鳴る
- 名所（武道館・桜田門・二重橋など）でカメラのアングルが切り替わる。重すぎてカクカクしないか
- ゴールで花火が上がり、結果画面の「シェアする」で iOS の共有シートが出る
- 言語の切り替え（日本語／English）ができる

---

## 3. 審査用の操作の録画を作る（申請の前に用意する）

審査の実績が少ない新しい開発者アカウントでは、初回の審査で「Guideline 2.1 - Information Needed」として、**実機（最新の iOS）での操作の画面録画**を求められます（techgymjp/jet-fighter の `docs/ANDROID_PORTING.md` 7-5）。申請の前に用意しておくと早く進みます。

1. iPhone の「設定」→「コントロールセンター」に「画面収録」を追加する
2. TestFlight（4 章）から入れたアプリ、または 2 章で入れたアプリを用意する。録画は**アプリを閉じた状態から**始める
3. コントロールセンターの「画面収録」を押して録画を始め、次の順に操作する（2〜3 分でよい）
   1. ホーム画面からアプリを起動する（起動画面 → トラッキングの確認 → タイトル画面）
   2. 「遊び方」を開き、説明を見せてからタイトルへ戻る
   3. 「スタート」で朝のステージを始め、左右のボタンでランナーをよけ、ダッシュとブレーキも使って見せる
   4. わざと人や車にぶつかり、ゲームオーバーと「広告を見て、続きから走る」の案内を見せる（本番広告ならタップしない。「結果へ」で進めてよい）
   5. 一時停止 → 再開。結果画面でシェアボタンを押して共有シートを見せる
4. 録画を止める（写真アプリに保存される）
5. 動画が大きいと App Review への返信に添付できない（400MB でも失敗した）。Mac の Finder で右クリック →「選択したビデオファイルをエンコード」→ 720p にして小さくするか、Google ドライブなどの共有リンクを返信文に貼る

録画と一緒に、次の文を「App Review に関する情報」の「メモ」に**最初の提出のときから**入れておきます（審査とのやり取りは英語。techgymjp/jet-fighter の `docs/ANDROID_PORTING.md` 7-6 のひな形）。依頼が来たときの返信にも同じ文を使い、録画は返信に添付します（メモの文には録画の項目を入れない）。

```
1. Purpose and audience: Kokyo Runner is a free 3D road bike game for ages 13+. The player rides a road bike around the Imperial Palace in Tokyo (about 6 km) and avoids runners, pedestrians, cars and motorbikes.

2. How to use: No login or account is needed. On the title screen, tap "Start" (スタート) to play. Controls: left, right, brake and dash buttons. The "How to play" (遊び方) screen explains the rules. The game is in English and Japanese (English is used automatically on English devices; the language can be switched on the title screen).

3. External services: Google AdMob (banner, interstitial and rewarded ads) with Google's consent form (UMP) and App Tracking Transparency. Rewarded ads are optional: after a crash, watching one lets the player continue from just before the crash (up to 5 times per game). No other services or in-app purchases.

4. Regional differences: None, except that the ad consent form appears only where required (e.g. EEA/UK).

5. Regulated content / third-party material: The game is not in a regulated industry. The city is built from open data: 3D building models from MLIT Project PLATEAU (open data that may be used commercially with attribution), elevation and water data from GSI Japan, and road data from OpenStreetMap (© OpenStreetMap contributors, ODbL). These sources are credited on the title screen. All other graphics and sounds are original.
```

---

## 4. App Store 用にビルドしてアップロードする（本番広告）

```bash
git pull && npm ci
npm run ios:release   # 本番の広告 ID でコピーする（ここが ios:sync と違う）
npm run ios:open
```

1. Xcode の左で「App」→「General」→「Identity」を開き、**Build の番号を前回より大きくする**（初回は 1。アップロードのたびに 2、3…と上げる。同じ番号は二度アップロードできない）。Version はストアに表示されるバージョン（1.0.0）
2. 上部の実行先を「**Any iOS Device (arm64)**」にする
3. メニューの「Product」→「**Archive**」
4. 終わると Organizer が開くので、「**Distribute App**」→「**App Store Connect**」→「Upload」で進める（途中の確認は既定のまま「Next」でよい）
5. 10〜30 分ほどで、App Store Connect の「TestFlight」タブにビルドが表示される

輸出コンプライアンス（暗号化）の質問は、Info.plist で「独自の暗号化は使っていない」と設定済みなので、聞かれません。

**注意**：`ios:release` でビルドしたアプリは本番の広告が出ます。TestFlight で確認するときも、**本番の広告はタップしない**でください（AdMob のアカウント停止の対象）。Xcode から iPhone に直接入れて試すときは、`npm run ios:sync` でテスト広告に戻してから実行します。
本番の広告ユニット ID がまだ入っていない種類は、本番ビルドでは出ません（`js/ads.js` の `UNITS.ios.production` が空のとき）。AdMob の ID を受け取って入れてから、App Store 用のビルドを作ってください。

---

## 5. TestFlight で確認する

1. App Store Connect の「TestFlight」→「内部テスト」でグループを作り、自分を追加する
2. iPhone に「TestFlight」アプリを App Store から入れ、届いた招待から皇居ランナーをインストールする
3. 3 章の録画は、ここで入れたアプリで撮ると審査に出すものと同じになる

---

## 6. App Store Connect で審査に出す

「配信」タブ（iOS App のバージョン 1.0.0）で入力します。**バージョンの欄が「1.0」になっていたら「1.0.0」に直して保存**します（アプリの Version と違うと、アップロードしたビルドを選べません）。

| 項目 | 入力内容 |
| --- | --- |
| スクリーンショット | 「Dynamic Island 搭載 iPhone（中型ディスプレイ）」の欄に、`docs/store/ios/6.3inch/` の 2622 × 1206（横向き）を入れる。日本語版（ja-）と英語版（en-）各 4 枚（1 ランナーの間をすり抜ける / 2 武道館の横アングル / 3 桜田門外の変（井伊直弼の行列） / 4 ゴールの花火と結果） |
| ヘッダ・検索結果 | 「ヘッダと検索結果」タブに `docs/store/ios/appstore-header-3840x1646.png` と `appstore-search-3840x2560.png`（ヘッダを入れたら、検索結果も必ず入れる） |
| 名前・サブタイトル・プロモーション用テキスト・概要・キーワード | `docs/store/ios/appstore-listing.md`（概要は Google Play 用の文章と同じ） |
| サポート URL | https://techgym.jp/ |
| プライバシーポリシー URL（App 情報・App のプライバシー） | https://techgym.jp/privacy-policy/ |
| 著作権 | 2026 TECH GYM K.K. |
| カテゴリ（App 情報） | ゲーム（サブカテゴリ「レース」） |
| コンテンツの配信権（App 情報） | 第三者のコンテンツ：「はい」→「必要な権利をすべて持っている」（建物・地形・道路にオープンデータの PLATEAU・国土地理院・OpenStreetMap を使い、出典をアプリ内に表示しているため。どれも商用利用できるライセンス） |
| ビルド | TestFlight で確認したビルドを選ぶ |
| 年齢制限 | 質問に答える（人や車にぶつかるとゲームオーバーになるが、けがや流血の描写はない。鬼が雷を落とす表現はアニメ調。広告あり） |
| App のプライバシー | AdMob が収集するデータを申告する（下記） |
| App Review に関する情報 | ログイン不要。連絡先を入力。メモに 3 章の文を書く |

**App のプライバシー（AdMob を使うアプリの目安）**
Google の「Apple の App Store のデータ開示要件への準備」（AdMob のヘルプ）に、AdMob が収集するデータの一覧があります。必ずそちらを見て最終確認してください。目安は次のとおりです。

- 収集する：ID（デバイス ID）、使用状況データ（広告データ、製品の操作）、診断（クラッシュデータ、パフォーマンスデータ、その他の診断データ）、位置情報（おおよその場所）
- 目的：サードパーティ広告、アナリティクス
- ユーザーに関連付け：しない
- トラッキングに使用：デバイス ID と広告データは「する」

入力が終わったら「審査用に追加」→「審査へ提出」。

---

## 7. 公開後にやること

- AdMob で iOS アプリを App Store のアプリに紐づける（「アプリ」→ iOS の皇居ランナー →「アプリの設定」）
- App Store からインストールして、起動・同意画面・トラッキングの確認・広告を確認する

---

## 8. 自動化の準備（2回目以降を GitHub Actions に任せる場合）

push するだけで GitHub Actions（GitHub の Mac 環境）がビルドし、TestFlight にアップロードできるようにする準備です。手順は techgymjp/jet-fighter の `docs/IOS_BUILD.md` の 7 章と同じです。
証明書と API キーはチーム共通なので、JET STRIKE で作ったものを使い回せます。techgymjp は組織ではなく個人のアカウントなので、**このリポジトリにも同じ 5 つの Secrets を登録**します（`https://github.com/techgymjp/kokyo/settings/secrets/actions`）。

| 名前 | 内容 |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | 配布用の証明書（.p12）を変換した文字列 |
| `IOS_DIST_CERT_PASSWORD` | .p12 を書き出したときのパスワード |
| `ASC_KEY_ID` | App Store Connect の API キーのキー ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | API キー（.p8）を変換した文字列 |

5 つが登録されていれば、`.github/workflows/ios.yml` が push のたびに次のことを自動で行います(登録されていないときは、署名なしで「ビルドできるか」だけを確認します)。

1. 本番の広告 ID でゲームのファイルを iOS のプロジェクトにコピーする(`npm run ios:release` と同じ)
2. 配布用の証明書で署名して Archive する。ビルド番号は「Actions の実行回数 + 100」(Mac から手でアップロードした 1、2、3… とぶつからないように)
3. App Store Connect にアップロードする。10〜30 分ほどで「TestFlight」タブにビルドが出る

Actions の実行のページの「Summary」に、アップロードしたバージョンとビルド番号が出ます。審査への提出は、これまでどおり App Store Connect で行います(6 章)。


**注意**：証明書（.p12）、そのパスワード、API キー（.p8）は、チャット・AI へのアップロード・リポジトリへのコミットで**絶対に共有しない**でください。

---

## つまずきやすいところ

| 症状 | 対処 |
| --- | --- |
| アップロードで「同じビルド番号がすでにある」 | General の Build の番号を上げてから Archive し直す |
| Signing でエラー（チームが選べない、証明書がない） | Xcode の Accounts で Apple ID にサインインし直し、Team に自分のチームを選ぶ。「Automatically manage signing」をオンにする |
| 実行先に iPhone が出ない | ケーブルをつなぎ直し、iPhone で「信頼」を許可。デベロッパモードをオンにする |
| 実行先に「iOS 26.x Not Installed」と出る | 「Get」で iOS のシミュレーターと部品をダウンロードする（8 GB ほど。Archive にも必要） |
| ビルドが古いゲームのまま | `npm run ios:sync`（または `ios:release`）を実行し忘れている。`git pull` してから実行し直す |
| 広告が出ない（本番ビルド） | `js/ads.js` の `UNITS.ios.production` に ID が入っているか、Info.plist の `GADApplicationIdentifier` が本番のアプリ ID かを確認する |
| ビルドを選ぼうとしても出てこない | バージョンのページの「バージョン」を 1.0.0 に直して保存する |
| 「審査用に追加できません」 | 「コンテンツの配信権」と「プライバシーポリシー URL」が入っているかを確認する |
| Archive で「Xcode Cloud can automate…」が出る | 「Remind Me Later」で閉じてよい |
| Xcode の「Product」メニューが見つからない | 画面最上部のメニューバーにある。全画面表示だと隠れるので、マウスを画面の上端に動かす |
| 本番広告とテスト広告の取り違え | App Store 用は必ず `npm run ios:release`。Xcode から実機で試すときは `npm run ios:sync` に戻す |
