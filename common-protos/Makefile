PROTOC_GEN_TS=node_modules/.bin/protoc-gen-ts

gen:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		user.proto
		
gen-claim:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		claim.proto

gen-chunk:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		chunk.proto

gen-upload:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		upload.proto

gen-point:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		point.proto
		
gen-auth:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		auth.proto

log:
	@grpc_tools_node_protoc \
		--js_out=import_style=commonjs,binary:. \
		--grpc_out=grpc_js:. \
		common-protos/logger.proto

gen-ts:
	@protoc \
		--plugin=protoc-gen-ts=$(PROTOC_GEN_TS) \
		--ts_out=grpc_js:. \
		common-protos/bzkps.proto

log-ts:
	@protoc \
		--plugin=protoc-gen-ts=$(PROTOC_GEN_TS) \
		--ts_out=grpc_js:. \
		common-protos/logger.proto
