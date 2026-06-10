if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/gradle/caches/9.3.1/transforms/7a37de1c07810a7b61641ccd7881b784/workspace/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/libs/android.armeabi-v7a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/gradle/caches/9.3.1/transforms/7a37de1c07810a7b61641ccd7881b784/workspace/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

