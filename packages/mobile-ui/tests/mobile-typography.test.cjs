const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function compile(file,mocks={}){
 const exports={};const source=fs.readFileSync(file,'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]});return exports;
}
const tokens=compile(path.join(__dirname,'../../design-tokens/src/typography.ts'));
function text(readable){return compile(path.join(__dirname,'../src/primitives/AppText.tsx'),{
 'react/jsx-runtime':{jsx:(type,props)=>({type,props})},'react-native':{Text:'NativeText',TextInput:'NativeInput'},
 '@startup/design-tokens':tokens,'../theme/MobileTypographyProvider':{useReadableTypography:()=>readable},
});}
test('the trial matches the requested eight size and line-height pairs',()=>{
 const expected={pageHeadline:[32,40],screenTitle:[28,36],sectionHeading:[24,32],cardHeading:[20,28],bodyEmphasis:[18,28],body:[16,24],label:[14,20],caption:[12,16]};
 for(const [role,[size,line]] of Object.entries(expected)){assert.equal(tokens.mobileTypography[role].fontSize,size);assert.equal(tokens.mobileTypography[role].lineHeight,line);}
});
test('readable roles override local font sizes without removing interaction or color',()=>{
 const {AppText}=text(true);const onPress=()=>{};const node=AppText({variant:'cardHeading',style:{fontSize:13,color:'#123456'},onPress,children:'Doctor'});
 const style=Object.assign({},...node.props.style.filter(Boolean));assert.equal(style.fontSize,20);assert.equal(style.lineHeight,28);assert.equal(style.color,'#123456');assert.equal(node.props.onPress,onPress);
});
test('without opt-in Doctor and Driver retain their legacy text styles exactly',()=>{
 const {AppText}=text(false);const original={fontSize:13,lineHeight:18,fontFamily:'ExistingFont'};
 const style=Object.assign({},...AppText({variant:'cardHeading',style:original}).props.style.filter(Boolean));assert.deepEqual(style,original);
});
test('nested brand text can inherit while readable inputs preserve native refs and values',()=>{
 const {AppText,AppTextInput}=text(true);const legacy={fontSize:48};assert.deepEqual(Object.assign({},...AppText({variant:'inherit',style:legacy}).props.style.filter(Boolean)),legacy);
 const ref={current:null},onChangeText=()=>{};const input=AppTextInput({ref,value:'9876543210',onChangeText,style:{fontSize:13}});const style=Object.assign({},...input.props.style.filter(Boolean));
 assert.equal(style.fontSize,16);assert.equal(style.lineHeight,24);assert.equal(input.props.ref,ref);assert.equal(input.props.value,'9876543210');assert.equal(input.props.onChangeText,onChangeText);
});
test('typography remains opt-in at the provider boundary',()=>{
 const jsx=(type,props)=>({type,props});const provider=compile(path.join(__dirname,'../src/theme/MobileTypographyProvider.tsx'),{
  'react/jsx-runtime':{jsx},react:{createContext:value=>{assert.equal(value,false);return {Provider:'Provider'};},useContext:()=>false},'@startup/design-tokens':tokens});
 assert.equal(provider.MobileTypographyProvider({enabled:false,children:'Patient'}).props.value,false);
 assert.equal(provider.MobileTypographyProvider({children:'Patient'}).props.value,true);
});
