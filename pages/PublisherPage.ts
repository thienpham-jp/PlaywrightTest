import { IstoolsPage } from "./istools-page";

export class PublisherPage extends IstoolsPage {

    async loginPub(pan: string, siteId: string) {
        await this.goto(`https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`);
    }
}