import Controller from '@ember/controller';
import ENV from '../config/environment';

export default class ApplicationController extends Controller {
  get version() {
    return ENV.VERSION;
  }
}
