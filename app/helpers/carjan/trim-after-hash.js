import { helper } from "@ember/component/helper";

export default helper(function trimAfterHash([value]) {
  return value.includes("#") ? value.split("#")[1] : value;
});
