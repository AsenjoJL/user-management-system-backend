import{a as ee}from"./chunk-DIB6YBDR.js";import{$ as W,A as I,Ba as G,D as S,E as y,Ea as x,F as c,Ga as H,H as s,J as M,Ja as K,La as X,M as b,Ma as Y,N as q,Na as Z,O as v,P as E,W as P,Y as T,Z as F,a as A,b as O,e as R,ha as N,i as f,ja as j,la as D,m as C,na as L,o as V,p as w,q as m,qa as U,r as u,ra as B,sa as $,t as a,ta as J,u as p,v as _,w as d,wa as Q,y as r,z as o,za as z}from"./chunk-5BKUYLAT.js";var te=()=>({standalone:!0});function le(n,g){n&1&&(r(0,"div",7),I(1,"div",8),o())}function ae(n,g){if(n&1){let e=S();r(0,"div",9),s(1),r(2,"button",10),y("click",function(){m(e);let t=c();return u(t.errorMessage="")}),o()()}if(n&2){let e=c();a(),M(" ",e.errorMessage," ")}}function de(n,g){if(n&1&&(r(0,"option",16),s(1),o()),n&2){let e=g.$implicit,i=c(2);d("ngValue",e.id),a(),M(" ",i.getEmployeeDisplay(e.id)," ")}}function ce(n,g){n&1&&(r(0,"div",30),s(1,' Click "Add Item" below to add items to your request. '),o())}function me(n,g){if(n&1){let e=S();r(0,"div",31)(1,"div",32)(2,"div",33)(3,"label",34),s(4,"Name "),r(5,"span",13),s(6,"*"),o()(),r(7,"input",35),v("ngModelChange",function(t){let l=m(e).$implicit;return q(l.name,t)||(l.name=t),u(t)}),o()(),r(8,"div",36)(9,"label",34),s(10,"Quantity "),r(11,"span",13),s(12,"*"),o()(),r(13,"input",37),v("ngModelChange",function(t){let l=m(e).$implicit;return q(l.quantity,t)||(l.quantity=t),u(t)}),o()(),r(14,"div",38)(15,"button",39),y("click",function(){let t=m(e).index,l=c(2);return u(l.removeItem(t))}),s(16," Remove "),o()()()()}if(n&2){let e=g.$implicit,i=c(2);a(7),b("ngModel",e.name),d("ngModelOptions",E(5,te)),a(6),b("ngModel",e.quantity),d("ngModelOptions",E(6,te)),a(2),d("disabled",i.request.requestItems.length===1)}}function ue(n,g){n&1&&I(0,"span",40)}function pe(n,g){if(n&1){let e=S();r(0,"div")(1,"div",11)(2,"label",12),s(3,"Type "),r(4,"span",13),s(5,"*"),o()(),r(6,"select",14),v("ngModelChange",function(t){m(e);let l=c();return q(l.request.type,t)||(l.request.type=t),u(t)}),r(7,"option",15),s(8,"-- Select Type --"),o(),r(9,"option"),s(10,"Equipment"),o(),r(11,"option"),s(12,"Leave"),o(),r(13,"option"),s(14,"Resources"),o()()(),r(15,"div",11)(16,"label",12),s(17,"Employee "),r(18,"span",13),s(19,"*"),o()(),r(20,"select",14),v("ngModelChange",function(t){m(e);let l=c();return q(l.request.employeeId,t)||(l.request.employeeId=t),u(t)}),r(21,"option",16),s(22,"-- Select Employee --"),o(),_(23,de,2,2,"option",17),o()(),r(24,"div",18)(25,"label",12),s(26,"Items "),r(27,"span",13),s(28,"*"),o()(),r(29,"div",19),_(30,ce,2,0,"div",20)(31,me,17,7,"div",21),r(32,"div",22)(33,"button",23),y("click",function(){m(e);let t=c();return u(t.addItem())}),I(34,"i",24),s(35," Add Item "),o()()()(),r(36,"div",25)(37,"button",26),y("click",function(){m(e);let t=c();return u(t.save())}),_(38,ue,1,0,"span",27),s(39," Save "),o(),I(40,"span",28),r(41,"button",29),y("click",function(){m(e);let t=c();return u(t.cancel())}),s(42,"Cancel"),o()()()}if(n&2){let e=c();a(6),b("ngModel",e.request.type),a(14),b("ngModel",e.request.employeeId),a(3),d("ngForOf",e.employees),a(7),d("ngIf",e.request.requestItems.length===0),a(),d("ngForOf",e.request.requestItems),a(6),d("disabled",e.submitting),a(),d("ngIf",e.submitting),a(3),d("disabled",e.submitting)}}var k=(()=>{class n{constructor(e,i,t,l,h,re,oe,se){this.requestService=e,this.employeeService=i,this.accountService=t,this.alertService=l,this.workflowService=h,this.route=re,this.router=oe,this.location=se,this.request={employeeId:null,type:"",status:"Pending",requestItems:[]},this.employees=[],this.accounts=[],this.loading=!1,this.submitting=!1,this.errorMessage="",this.currentUser=null,this.initialRequestItems=[],this.currentUser=this.accountService.accountValue}ngOnInit(){this.id=this.route.snapshot.params.id,this.id||this.route.queryParams.subscribe(e=>{e.employeeId&&(this.request.employeeId=Number(e.employeeId),console.log(`Pre-filling request for employee ID: ${this.request.employeeId}`))}),this.loading=!0,R({employees:this.employeeService.getAll(),accounts:this.accountService.getAll()}).pipe(f()).subscribe({next:e=>{if(this.employees=e.employees||[],this.accounts=e.accounts||[],console.log("Loaded reference data:",{employees:this.employees.length,accounts:this.accounts.length}),!this.id&&!this.request.employeeId&&this.currentUser){let i=this.employees.find(t=>t.userId===this.currentUser.id);i&&(this.request.employeeId=i.id,console.log(`Auto-selected employee ID ${this.request.employeeId} for the current user`))}this.id?this.loadRequest():((!this.request.requestItems||!this.request.requestItems.length)&&this.addItem(),this.loading=!1)},error:e=>{console.error("Error loading reference data:",e),this.errorMessage="Failed to load reference data",this.loading=!1}}),(!this.request.requestItems||this.request.requestItems.length===0)&&this.addItem()}loadRequest(){this.requestService.getById(this.id).pipe(f()).subscribe({next:e=>{e&&(console.log("Loaded request data for editing:",e),this.request=e,e.RequestItems&&Array.isArray(e.RequestItems)&&e.RequestItems.length>0?(console.log("Found items in RequestItems:",e.RequestItems),this.request.requestItems=e.RequestItems):!this.request.requestItems||this.request.requestItems.length===0?(console.log("No items found in request, creating empty item"),this.request.requestItems=[],this.addItem()):console.log("Found items in requestItems:",this.request.requestItems),this.initialRequestItems=JSON.parse(JSON.stringify(this.request.requestItems||[]))),this.loading=!1},error:e=>{console.error(`Error loading request ${this.id}:`,e),this.errorMessage="Failed to load request",this.loading=!1}})}addItem(){this.request.requestItems||(this.request.requestItems=[]),this.request.requestItems.push({name:"",quantity:1})}removeItem(e){this.request.requestItems&&(this.request.requestItems.splice(e,1),this.request.requestItems.length===0&&this.addItem())}save(){if(this.submitting=!0,this.errorMessage="",!this.request.type||!this.request.employeeId){this.errorMessage="Please fill in all required fields",this.submitting=!1;return}if((!this.request.requestItems||this.request.requestItems.length===0)&&this.addItem(),this.request.requestItems.some(t=>!t.name||!t.quantity||t.quantity<1)){this.errorMessage="Please ensure all items have a name and quantity",this.submitting=!1;return}console.log("About to save request with items:",this.request.requestItems);let i=O(A({},this.request),{employeeId:typeof this.request.employeeId=="string"?parseInt(this.request.employeeId):this.request.employeeId,requestItems:this.request.requestItems.filter(t=>t.name&&t.name.trim()!=="").map(t=>({id:t.id,name:t.name,quantity:parseInt(t.quantity?.toString()||"1"),description:t.description||""}))});console.log("Cleaned request to save:",i),this.id?this.requestService.update(this.id,i).pipe(f()).subscribe({next:t=>{this.createOrUpdateWorkflow(t),this.alertService.success("Request updated",{keepAfterRouteChange:!0}),setTimeout(()=>this.router.navigate(["/admin/requests"]),500)},error:t=>{this.errorMessage=typeof t=="string"?t:"Failed to update request",this.submitting=!1}}):this.requestService.create(i).pipe(f()).subscribe({next:t=>{this.createOrUpdateWorkflow(t),this.alertService.success("Request created",{keepAfterRouteChange:!0}),setTimeout(()=>this.router.navigate(["/admin/requests"]),500)},error:t=>{this.errorMessage=typeof t=="string"?t:"Failed to create request",this.submitting=!1}})}createOrUpdateWorkflow(e){if(!e||!e.id){console.warn("Cannot create workflow for invalid request:",e);return}let i=typeof e.employeeId=="string"?parseInt(e.employeeId,10):e.employeeId;if(!i){console.warn("Cannot create workflow without employeeId:",e);return}let t=e.requestItems?e.requestItems.map(h=>`${h.name} (x${h.quantity})`).join(", "):"",l={employeeId:i,type:`${e.type} Request`,details:{items:t,requestId:e.id},status:"Pending"};console.log("Creating workflow for request:",l),this.workflowService.create(l).pipe(f()).subscribe({next:()=>console.log("Workflow created successfully for request",e.id),error:h=>console.error("Error creating workflow:",h)})}cancel(){this.id?this.requestService.getById(this.id).pipe(f()).subscribe({next:()=>{console.log("Request data refreshed in cache before navigation"),this.location.back()},error:()=>this.location.back()}):this.location.back()}getEmployeeDisplay(e){if(e==null)return"Select Employee";let i=this.employees.find(l=>l.id===e);if(!i)return`Unknown (ID: ${e})`;let t=this.accounts.find(l=>l.id===i.userId);return t?`${t.email} (${i.employeeId})`:i.employeeId}static{this.\u0275fac=function(i){return new(i||n)(p(Z),p(Y),p(H),p(K),p(X),p(z),p(G),p(P))}}static{this.\u0275cmp=V({type:n,selectors:[["ng-component"]],decls:8,vars:4,consts:[[1,"card"],[1,"card-header"],[1,"mb-0"],[1,"card-body"],["class","text-center py-3",4,"ngIf"],["class","alert alert-danger",4,"ngIf"],[4,"ngIf"],[1,"text-center","py-3"],["role","status",1,"spinner-border","text-primary"],[1,"alert","alert-danger"],["type","button",1,"btn-close","float-end",3,"click"],[1,"mb-3"],[1,"form-label"],[1,"text-danger"],[1,"form-select",3,"ngModelChange","ngModel"],["value",""],[3,"ngValue"],[3,"ngValue",4,"ngFor","ngForOf"],[1,"mb-4"],[1,"request-items-container","border","rounded","p-3","bg-light"],["class","text-center text-muted py-3",4,"ngIf"],["class","mb-3 item-row",4,"ngFor","ngForOf"],[1,"mt-3","text-start"],[1,"btn","btn-secondary",3,"click"],[1,"bi","bi-plus-circle","me-1"],[1,"d-flex","justify-content-center","mt-4"],[1,"btn","btn-primary",3,"click","disabled"],["class","spinner-border spinner-border-sm me-1",4,"ngIf"],[2,"display","inline-block","width","10px"],[1,"btn","btn-secondary",3,"click","disabled"],[1,"text-center","text-muted","py-3"],[1,"mb-3","item-row"],[1,"row","g-2"],[1,"col-md-6"],[1,"form-label","d-block"],["type","text","placeholder","Enter item name",1,"form-control","w-100",3,"ngModelChange","ngModel","ngModelOptions"],[1,"col-md-4"],["type","number","min","1","placeholder","Enter quantity",1,"form-control","w-100",3,"ngModelChange","ngModel","ngModelOptions"],[1,"col-md-2","d-flex","align-items-end"],[1,"btn","btn-danger","w-100",3,"click","disabled"],[1,"spinner-border","spinner-border-sm","me-1"]],template:function(i,t){i&1&&(r(0,"div",0)(1,"div",1)(2,"h4",2),s(3),o()(),r(4,"div",3),_(5,le,2,0,"div",4)(6,ae,3,1,"div",5)(7,pe,43,8,"div",6),o()()),i&2&&(a(3),M("",t.id?"EDIT":"ADD"," REQUEST"),a(2),d("ngIf",t.loading),a(),d("ngIf",t.errorMessage),a(),d("ngIf",!t.loading))},dependencies:[T,F,B,$,N,L,U,j,J,D],styles:[`.form-label[_ngcontent-%COMP%] {
        font-weight: 500;
        margin-bottom: 0.5rem;
        display: block;
    }
    
    .form-select[_ngcontent-%COMP%], .form-control[_ngcontent-%COMP%] {
        padding: 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid #ced4da;
        background-color: #fff;
        height: 38px;
        width: 100%;
    }
    
    .form-select[_ngcontent-%COMP%] {
        appearance: auto;
        -webkit-appearance: auto;
    }
    
    .card-header[_ngcontent-%COMP%] {
        background-color: #f8f9fa;
        border-bottom: 1px solid rgba(0,0,0,.125);
    }
    
    .btn[_ngcontent-%COMP%] {
        padding: 0.375rem 1rem;
    }
    
    .request-items-container[_ngcontent-%COMP%] {
        transition: all 0.3s ease;
        max-height: 500px;
        overflow-y: auto;
    }
    
    .item-row[_ngcontent-%COMP%] {
        padding: 10px;
        border-bottom: 1px solid #e9ecef;
    }
    
    .item-row[_ngcontent-%COMP%]:last-child {
        border-bottom: none;
    }
    
    .bg-light[_ngcontent-%COMP%] {
        background-color: #f8f9fa;
    }
    
    .border[_ngcontent-%COMP%] {
        border: 1px solid #dee2e6 !important;
    }
    
    .rounded[_ngcontent-%COMP%] {
        border-radius: 0.25rem !important;
    }
    
    .p-3[_ngcontent-%COMP%] {
        padding: 1rem !important;
    }
    
    

    .form-control[_ngcontent-%COMP%]:focus, .form-select[_ngcontent-%COMP%]:focus {
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
    }
    
    .btn-close[_ngcontent-%COMP%] {
        background: transparent;
        border: 0;
        font-size: 1.5rem;
        padding: 0.25rem;
        cursor: pointer;
        opacity: 0.5;
    }
    
    .btn-close[_ngcontent-%COMP%]:hover {
        opacity: 1;
    }
    
    .float-end[_ngcontent-%COMP%] {
        float: right;
    }`]})}}return n})();var ge=[{path:"",component:ee},{path:"add",component:k},{path:"edit/:id",component:k}],ne=(()=>{class n{static{this.\u0275fac=function(i){return new(i||n)}}static{this.\u0275mod=w({type:n})}static{this.\u0275inj=C({imports:[x.forChild(ge),x]})}}return n})();var Te=(()=>{class n{static{this.\u0275fac=function(i){return new(i||n)}}static{this.\u0275mod=w({type:n})}static{this.\u0275inj=C({imports:[W,Q,x,ne]})}}return n})();export{Te as RequestsModule};
