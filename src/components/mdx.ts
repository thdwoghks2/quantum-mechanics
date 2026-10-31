/** 레슨 MDX에서 import 없이 쓸 수 있는 컴포넌트들 */
import Screen from './screen/Screen.astro';
import S from './screen/S.astro';
import Later from './screen/Later.astro';
import Define from './kinds/Define.astro';
import Check from './kinds/Check.astro';
import Numeric from './kinds/Numeric.astro';
import Analogy from './kinds/Analogy.astro';
import DailyProblem from './kinds/DailyProblem.astro';
import ThreeLines from './kinds/ThreeLines.astro';
import Reflect from './kinds/Reflect.astro';
import Plot from './figures/Plot.astro';
import BigNumber from './figures/BigNumber.astro';
import DataTable from './figures/DataTable.astro';
import Flow from './figures/Flow.astro';
import Panels from './figures/Panels.astro';
import Icon from './figures/Icon.astro';
import { sims } from './sims/index.ts';

export const mdxComponents = {
  Screen,
  S,
  Later,
  Define,
  Check,
  Numeric,
  Analogy,
  DailyProblem,
  ThreeLines,
  Reflect,
  Plot,
  BigNumber,
  DataTable,
  Flow,
  Panels,
  Icon,
  ...sims,
};
